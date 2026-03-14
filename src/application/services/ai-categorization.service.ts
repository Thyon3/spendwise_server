import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
}

export interface TrainingData {
  description: string;
  amount: number;
  merchant?: string;
  categoryId: string;
}

@Injectable()
export class AiCategorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async categorizeExpense(userId: string, data: {
    description: string;
    amount: number;
    merchant?: string;
    date?: Date;
  }): Promise<CategorizationResult> {
    try {
      // Get user's categories and historical data
      const [categories, userExpenses] = await Promise.all([
        this.prisma.category.findMany({ where: { userId } }),
        this.prisma.expense.findMany({
          where: { userId },
          include: { category: true },
          orderBy: { date: 'desc' },
          take: 100, // Last 100 expenses for pattern recognition
        }),
      ]);

      // Analyze patterns and predict category
      const prediction = await this.predictCategory(data, categories, userExpenses);

      // If confidence is low, use fallback rules
      if (prediction.confidence < 0.6) {
        const fallbackPrediction = this.applyFallbackRules(data, categories);
        return {
          ...fallbackPrediction,
          reasoning: `${prediction.reasoning} (Fallback rules applied due to low confidence)`,
        };
      }

      return prediction;
    } catch (error) {
      throw new HttpException(
        `AI categorization failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async trainModel(userId: string, trainingData: TrainingData[]): Promise<void> {
    // In a real implementation, this would train a machine learning model
    // For this example, we'll store the training data and update our pattern matching
    
    try {
      // Store training data for future model improvement
      for (const data of trainingData) {
        await this.prisma.categorizationTraining.create({
          data: {
            userId,
            description: data.description,
            amount: data.amount,
            merchant: data.merchant,
            categoryId: data.categoryId,
          },
        });
      }

      // Update pattern matching rules based on new data
      await this.updatePatternMatchingRules(userId, trainingData);
    } catch (error) {
      throw new HttpException(
        `Model training failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCategorizationAccuracy(userId: string): Promise<{
    overallAccuracy: number;
    categoryAccuracy: Array<{
      categoryName: string;
      accuracy: number;
      sampleCount: number;
    }>;
    recentPerformance: Array<{
      date: string;
      accuracy: number;
    }>;
  }> {
    // Get recent categorization performance
    const recentCategorizations = await this.prisma.categorizationTraining.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Calculate accuracy metrics
    const overallAccuracy = this.calculateAccuracy(recentCategorizations);
    const categoryAccuracy = this.calculateCategoryAccuracy(recentCategorizations);
    const recentPerformance = this.calculateRecentPerformance(recentCategorizations);

    return {
      overallAccuracy,
      categoryAccuracy,
      recentPerformance,
    };
  }

  async suggestCategoryImprovements(userId: string): Promise<{
    weakCategories: string[];
    suggestions: Array<{
      category: string;
      issue: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    const [categories, trainingData] = await Promise.all([
      this.prisma.category.findMany({ where: { userId } }),
      this.prisma.categorizationTraining.findMany({ where: { userId } }),
    ]);

    const suggestions: Array<{
      category: string;
      issue: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Analyze each category for issues
    for (const category of categories) {
      const categoryData = trainingData.filter(d => d.categoryId === category.id);
      
      if (categoryData.length < 10) {
        suggestions.push({
          category: category.name,
          issue: 'Insufficient training data',
          suggestion: 'Add more examples to improve categorization accuracy',
          priority: 'high',
        });
      }

      // Check for inconsistent patterns
      const descriptions = categoryData.map(d => d.description.toLowerCase());
      const uniquePatterns = new Set(descriptions).size;
      
      if (uniquePatterns > categoryData.length * 0.8) {
        suggestions.push({
          category: category.name,
          issue: 'Too many unique patterns',
          suggestion: 'Consider creating subcategories or refining category definitions',
          priority: 'medium',
        });
      }
    }

    // Check for overlapping categories
    const overlaps = this.findCategoryOverlaps(trainingData);
    suggestions.push(...overlaps);

    return {
      weakCategories: suggestions.filter(s => s.priority === 'high').map(s => s.category),
      suggestions,
    };
  }

  private async predictCategory(
    expenseData: { description: string; amount: number; merchant?: string },
    categories: any[],
    userExpenses: any[]
  ): Promise<CategorizationResult> {
    const description = expenseData.description.toLowerCase();
    const merchant = expenseData.merchant?.toLowerCase() || '';
    
    // Pattern matching scores
    const categoryScores = new Map<string, { score: number; reasoning: string[] }>();

    // Initialize scores
    categories.forEach(category => {
      categoryScores.set(category.id, { score: 0, reasoning: [] });
    });

    // 1. Keyword matching
    const keywordMatches = this.matchKeywords(description, merchant, categories);
    keywordMatches.forEach((match, categoryId) => {
      const current = categoryScores.get(categoryId)!;
      current.score += match.score;
      current.reasoning.push(match.reasoning);
    });

    // 2. Amount range matching
    const amountMatches = this.matchAmounts(expenseData.amount, categories, userExpenses);
    amountMatches.forEach((match, categoryId) => {
      const current = categoryScores.get(categoryId)!;
      current.score += match.score;
      current.reasoning.push(match.reasoning);
    });

    // 3. Merchant pattern matching
    if (merchant) {
      const merchantMatches = this.matchMerchants(merchant, userExpenses);
      merchantMatches.forEach((match, categoryId) => {
        const current = categoryScores.get(categoryId)!;
        current.score += match.score;
        current.reasoning.push(match.reasoning);
      });
    }

    // 4. Historical pattern matching
    const historicalMatches = this.matchHistoricalPatterns(description, userExpenses);
    historicalMatches.forEach((match, categoryId) => {
      const current = categoryScores.get(categoryId)!;
      current.score += match.score;
      current.reasoning.push(match.reasoning);
    });

    // Find best match
    let bestCategoryId = '';
    let bestScore = 0;
    let bestReasoning = '';

    categoryScores.forEach((score, categoryId) => {
      if (score.score > bestScore) {
        bestScore = score.score;
        bestCategoryId = categoryId;
        bestReasoning = score.reasoning.join('; ');
      }
    });

    // Calculate confidence (normalize score)
    const maxPossibleScore = 100; // Maximum possible score
    const confidence = Math.min(bestScore / maxPossibleScore, 1);

    const bestCategory = categories.find(c => c.id === bestCategoryId)!;

    // Get alternatives
    const alternatives = Array.from(categoryScores.entries())
      .filter(([id, score]) => id !== bestCategoryId && score.score > 0)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([categoryId, score]) => ({
        categoryId,
        categoryName: categories.find(c => c.id === categoryId)!.name,
        confidence: Math.min(score.score / maxPossibleScore, 1),
      }));

    return {
      categoryId: bestCategoryId,
      categoryName: bestCategory.name,
      confidence,
      reasoning: bestReasoning || 'Pattern-based prediction',
      alternativeCategories: alternatives,
    };
  }

  private matchKeywords(description: string, merchant: string, categories: any[]): Map<string, { score: number; reasoning: string }> {
    const matches = new Map<string, { score: number; reasoning: string }>();
    
    const keywordMap: Record<string, string[]> = {
      'Food & Dining': ['restaurant', 'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'pizza', 'burger'],
      'Groceries': ['grocery', 'supermarket', 'walmart', 'target', 'kroger', 'safeway', 'food', 'produce'],
      'Transportation': ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'parking', 'metro', 'bus', 'train', 'airport'],
      'Shopping': ['amazon', 'store', 'shop', 'purchase', 'retail', 'mall', 'clothing', 'shoes'],
      'Entertainment': ['movie', 'theater', 'concert', 'netflix', 'spotify', 'game', 'entertainment'],
      'Bills & Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'utility', 'bill'],
      'Healthcare': ['pharmacy', 'medical', 'doctor', 'hospital', 'health', 'medicine'],
      'Education': ['tuition', 'course', 'book', 'education', 'school', 'university'],
    };

    const combinedText = `${description} ${merchant}`;

    categories.forEach(category => {
      const keywords = keywordMap[category.name] || [];
      let score = 0;
      const matchedKeywords: string[] = [];

      keywords.forEach(keyword => {
        if (combinedText.includes(keyword)) {
          score += 20;
          matchedKeywords.push(keyword);
        }
      });

      if (score > 0) {
        matches.set(category.id, {
          score,
          reasoning: `Keyword match: ${matchedKeywords.join(', ')}`,
        });
      }
    });

    return matches;
  }

  private matchAmounts(amount: number, categories: any[], userExpenses: any[]): Map<string, { score: number; reasoning: string }> {
    const matches = new Map<string, { score: number; reasoning: string }>();

    // Analyze typical amount ranges for each category
    const categoryAmounts = new Map<string, number[]>();
    
    userExpenses.forEach(expense => {
      if (!categoryAmounts.has(expense.categoryId)) {
        categoryAmounts.set(expense.categoryId, []);
      }
      categoryAmounts.get(expense.categoryId)!.push(expense.amount);
    });

    categories.forEach(category => {
      const amounts = categoryAmounts.get(category.id) || [];
      if (amounts.length < 5) return; // Not enough data

      const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length);

      // Check if amount is within 2 standard deviations
      const deviation = Math.abs(amount - mean);
      if (deviation <= 2 * stdDev) {
        const score = Math.max(0, 30 - (deviation / stdDev) * 15);
        matches.set(category.id, {
          score,
          reasoning: `Amount range match (typical: $${mean.toFixed(2)} ± $${stdDev.toFixed(2)})`,
        });
      }
    });

    return matches;
  }

  private matchMerchants(merchant: string, userExpenses: any[]): Map<string, { score: number; reasoning: string }> {
    const matches = new Map<string, { score: number; reasoning: string }>();

    // Find similar merchants in user history
    const merchantCategories = new Map<string, string[]>();
    
    userExpenses.forEach(expense => {
      if (expense.merchant) {
        const expenseMerchant = expense.merchant.toLowerCase();
        if (!merchantCategories.has(expense.categoryId)) {
          merchantCategories.set(expense.categoryId, []);
        }
        merchantCategories.get(expense.categoryId)!.push(expenseMerchant);
      }
    });

    merchantCategories.forEach((merchants, categoryId) => {
      merchants.forEach(historicalMerchant => {
        if (historicalMerchant.includes(merchant) || merchant.includes(historicalMerchant)) {
          const existing = matches.get(categoryId);
          const score = 25;
          if (existing) {
            existing.score += score;
            existing.reasoning += `; Merchant match: ${historicalMerchant}`;
          } else {
            matches.set(categoryId, {
              score,
              reasoning: `Merchant match: ${historicalMerchant}`,
            });
          }
        }
      });
    });

    return matches;
  }

  private matchHistoricalPatterns(description: string, userExpenses: any[]): Map<string, { score: number; reasoning: string }> {
    const matches = new Map<string, { score: number; reasoning: string }>();

    // Find similar descriptions in user history
    const descriptionCategories = new Map<string, string[]>();
    
    userExpenses.forEach(expense => {
      if (expense.description) {
        const expenseDescription = expense.description.toLowerCase();
        if (!descriptionCategories.has(expense.categoryId)) {
          descriptionCategories.set(expense.categoryId, []);
        }
        descriptionCategories.get(expense.categoryId)!.push(expenseDescription);
      }
    });

    descriptionCategories.forEach((descriptions, categoryId) => {
      descriptions.forEach(historicalDescription => {
        const similarity = this.calculateStringSimilarity(description, historicalDescription);
        if (similarity > 0.7) {
          const existing = matches.get(categoryId);
          const score = similarity * 15;
          if (existing) {
            existing.score += score;
            existing.reasoning += `; Similar description: ${historicalDescription.substring(0, 50)}...`;
          } else {
            matches.set(categoryId, {
              score,
              reasoning: `Similar description: ${historicalDescription.substring(0, 50)}...`,
            });
          }
        }
      });
    });

    return matches;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation (Jaccard similarity)
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private applyFallbackRules(expenseData: { description: string; amount: number; merchant?: string }, categories: any[]): CategorizationResult {
    const description = expenseData.description.toLowerCase();
    const merchant = expenseData.merchant?.toLowerCase() || '';

    // Simple rule-based fallback
    const rules = [
      { keywords: ['restaurant', 'food', 'dining'], category: 'Food & Dining' },
      { keywords: ['grocery', 'supermarket'], category: 'Groceries' },
      { keywords: ['gas', 'fuel', 'uber', 'lyft'], category: 'Transportation' },
      { keywords: ['amazon', 'shop', 'store'], category: 'Shopping' },
      { keywords: ['movie', 'netflix', 'entertainment'], category: 'Entertainment' },
      { keywords: ['electric', 'water', 'phone', 'internet'], category: 'Bills & Utilities' },
      { keywords: ['pharmacy', 'medical', 'health'], category: 'Healthcare' },
    ];

    const combinedText = `${description} ${merchant}`;
    
    for (const rule of rules) {
      if (rule.keywords.some(keyword => combinedText.includes(keyword))) {
        const category = categories.find(c => c.name === rule.category);
        if (category) {
          return {
            categoryId: category.id,
            categoryName: category.name,
            confidence: 0.5,
            reasoning: `Fallback rule: ${rule.keywords.join(', ')}`,
            alternativeCategories: [],
          };
        }
      }
    }

    // Default to "General" or first category
    const defaultCategory = categories.find(c => c.name === 'General') || categories[0];
    
    return {
      categoryId: defaultCategory.id,
      categoryName: defaultCategory.name,
      confidence: 0.3,
      reasoning: 'Default categorization (no matching rules found)',
      alternativeCategories: [],
    };
  }

  private async updatePatternMatchingRules(userId: string, trainingData: TrainingData[]): Promise<void> {
    // In a real implementation, this would update the AI model
    // For now, we'll just log that training data was received
    console.log(`Updated pattern matching rules for user ${userId} with ${trainingData.length} new examples`);
  }

  private calculateAccuracy(trainingData: any[]): number {
    // Simplified accuracy calculation
    const correctPredictions = trainingData.filter(d => d.wasCorrect).length;
    return trainingData.length > 0 ? correctPredictions / trainingData.length : 0;
  }

  private calculateCategoryAccuracy(trainingData: any[]): Array<{ categoryName: string; accuracy: number; sampleCount: number }> {
    const categoryStats = new Map<string, { correct: number; total: number }>();
    
    trainingData.forEach(data => {
      const category = data.categoryName || 'Unknown';
      const stats = categoryStats.get(category) || { correct: 0, total: 0 };
      stats.total++;
      if (data.wasCorrect) stats.correct++;
      categoryStats.set(category, stats);
    });

    return Array.from(categoryStats.entries()).map(([categoryName, stats]) => ({
      categoryName,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      sampleCount: stats.total,
    }));
  }

  private calculateRecentPerformance(trainingData: any[]): Array<{ date: string; accuracy: number }> {
    // Group by date and calculate daily accuracy
    const dailyStats = new Map<string, { correct: number; total: number }>();
    
    trainingData.forEach(data => {
      const date = data.createdAt.toISOString().split('T')[0];
      const stats = dailyStats.get(date) || { correct: 0, total: 0 };
      stats.total++;
      if (data.wasCorrect) stats.correct++;
      dailyStats.set(date, stats);
    });

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }

  private findCategoryOverlaps(trainingData: any[]): Array<{
    category: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    // Analyze overlapping patterns between categories
    const suggestions: Array<{
      category: string;
      issue: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // This is a simplified implementation
    // In reality, you'd use more sophisticated overlap detection
    
    return suggestions;
  }
}
