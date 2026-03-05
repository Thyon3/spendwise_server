export const ErrorMessages = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  
  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  INVALID_USER_DATA: 'Invalid user data',
  
  // Expense
  EXPENSE_NOT_FOUND: 'Expense not found',
  INVALID_EXPENSE_DATA: 'Invalid expense data',
  EXPENSE_CREATION_FAILED: 'Failed to create expense',
  
  // Budget
  BUDGET_NOT_FOUND: 'Budget not found',
  BUDGET_EXCEEDED: 'Budget limit exceeded',
  INVALID_BUDGET_DATA: 'Invalid budget data',
  
  // Category
  CATEGORY_NOT_FOUND: 'Category not found',
  CATEGORY_IN_USE: 'Category is in use and cannot be deleted',
  DUPLICATE_CATEGORY: 'Category already exists',
  
  // General
  INTERNAL_SERVER_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  FORBIDDEN: 'Access forbidden',
  
  // File
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_UPLOAD_FAILED: 'File upload failed',
  
  // Payment
  PAYMENT_METHOD_NOT_FOUND: 'Payment method not found',
  INVALID_PAYMENT_DATA: 'Invalid payment data',
  
  // Goal
  GOAL_NOT_FOUND: 'Goal not found',
  GOAL_ALREADY_COMPLETED: 'Goal is already completed',
};
