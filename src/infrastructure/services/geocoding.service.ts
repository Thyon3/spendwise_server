import { Injectable } from '@nestjs/common';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

@Injectable()
export class GeocodingService {
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    console.log(`Geocoding coordinates: ${latitude}, ${longitude}`);
    // TODO: Integrate with geocoding service (Google Maps, Mapbox, etc.)
    return 'Sample Address, City, Country';
  }

  async getCoordinatesFromAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    console.log(`Getting coordinates for address: ${address}`);
    // TODO: Integrate with geocoding service
    return { latitude: 0, longitude: 0 };
  }

  async getNearbyExpenses(userId: string, latitude: number, longitude: number, radiusKm: number): Promise<any[]> {
    console.log(`Finding expenses near ${latitude}, ${longitude} within ${radiusKm}km`);
    // TODO: Query expenses with location within radius
    return [];
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
