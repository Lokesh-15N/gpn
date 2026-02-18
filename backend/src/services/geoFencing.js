/**
 * Haversine formula to calculate distance between two GPS coordinates
 * Returns distance in meters
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // meters

  return distance;
};

/**
 * Validate check-in location using geo-fencing
 */
export const validateCheckInLocation = async (tokenId, patientLat, patientLon) => {
  try {
    const { Token, Hospital } = await import('../models/index.js');

    // Get token and hospital details
    const token = await Token.findByPk(tokenId, {
      include: [{ model: Hospital, as: 'hospital' }]
    });

    if (!token) {
      throw new Error('Token not found');
    }

    const hospitalLat = parseFloat(token.hospital.latitude);
    const hospitalLon = parseFloat(token.hospital.longitude);
    const geofenceRadius = token.hospital.geofence_radius || 200;

    // Calculate distance
    const distance = calculateHaversineDistance(
      patientLat,
      patientLon,
      hospitalLat,
      hospitalLon
    );

    // Check if within geofence
    if (distance <= geofenceRadius) {
      return {
        success: true,
        message: 'Check-in successful',
        distance: Math.round(distance * 10) / 10
      };
    } else {
      return {
        success: false,
        error_code: 'GEOFENCE_VIOLATION',
        message: `You must be within ${geofenceRadius}m of the hospital`,
        current_distance: Math.round(distance * 10) / 10,
        required_distance: geofenceRadius
      };
    }
  } catch (error) {
    console.error('Error validating check-in location:', error);
    throw error;
  }
};
