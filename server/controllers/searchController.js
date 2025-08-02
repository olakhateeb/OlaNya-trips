const db = require("../db");

/**
 * Search across trips, camping spots, and attractions
 * @param {Object} req - Request object with search criteria
 * @param {Object} res - Response object
 */
exports.searchAll = async (req, res) => {
  try {
    const {
      likesWater,
      tripType,
      location,
      duration,
      region,
      isAccessible,
      hasParking,
      hasServices,
      isRomantic,
      isPetFriendly,
      // New filter options
      attractionType,
      hasFoodOptions,
      isKidFriendly,
      hasShade,
      hasGuidedTours,
      difficultyLevel
    } = req.query;

    // Initialize results object
    const results = {
      trips: [],
      campings: [],
      attractions: []
    };

    // Build base queries with common filters
    let tripsQuery = "SELECT * FROM trips WHERE 1=1";
    let campingsQuery = "SELECT * FROM camping WHERE 1=1";
    let attractionsQuery = "SELECT * FROM attractions WHERE 1=1";

    // Initialize parameters arrays for prepared statements
    let tripsParams = [];
    let campingsParams = [];
    let attractionsParams = [];

    // Filter by trip type
    if (tripType === "hiking") {
        // For hiking, look for specific trip types in the trips table
        tripsQuery += " AND (trip_type LIKE ? OR trip_type LIKE ? OR trip_type LIKE ?)";
        tripsParams.push("%הליכה%", "%טבע%", "%טיול רגלי%");
        
        // Exclude camping spots and attractions
        campingsQuery += " AND 1=0";
        attractionsQuery += " AND 1=0";
    } else if (tripType === "camping") {
        // Only include camping spots
        tripsQuery += " AND 1=0";
        attractionsQuery += " AND 1=0";
    } else if (tripType === "attraction") {
        // Only include attractions
        tripsQuery += " AND 1=0";
        campingsQuery += " AND 1=0";
    } else if (tripType && tripType !== "any") {
        // For other specific trip types
        tripsQuery += " AND trip_type LIKE ?";
        tripsParams.push(`%${tripType}%`);
        
        // Exclude camping spots and attractions
        campingsQuery += " AND 1=0";
        attractionsQuery += " AND 1=0";
    }

    // Filter by location
    if (location) {
      // For trips, search in trip_name and trip_description
      tripsQuery += " AND (trip_name LIKE ? OR trip_description LIKE ?)";
      tripsParams.push(`%${location}%`, `%${location}%`);
      
      // For camping, search in camping_location_name and camping_description
      campingsQuery += " AND (camping_location_name LIKE ? OR camping_description LIKE ?)";
      campingsParams.push(`%${location}%`, `%${location}%`);
      
      // For attractions, search in attraction_name and attraction_description
      attractionsQuery += " AND (attraction_name LIKE ? OR attraction_description LIKE ?)";
      attractionsParams.push(`%${location}%`, `%${location}%`);
    }

    // Filter by region - using description fields since region columns don't exist
    if (region) {
      // For trips, search in trip_description
      tripsQuery += " AND trip_description LIKE ?";
      tripsParams.push(`%${region}%`);
      
      // For camping, search in camping_description
      campingsQuery += " AND camping_description LIKE ?";
      campingsParams.push(`%${region}%`);
      
      // For attractions, search in attraction_description
      attractionsQuery += " AND attraction_description LIKE ?";
      attractionsParams.push(`%${region}%`);
    }

    // Filter by duration
    if (duration) {
      // For trips, check trip_duration field
      if (duration === "day") {
        tripsQuery += " AND trip_duration LIKE ?";
        tripsParams.push("%שעות%");
      } else if (duration === "weekend") {
        tripsQuery += " AND trip_duration LIKE ?";
        tripsParams.push("%לילה%");
      } else if (duration === "week" || duration === "long") {
        tripsQuery += " AND trip_duration LIKE ?";
        tripsParams.push("%לפחות%");
      }
      
      // For camping, filter by camping_duration
      if (duration === "day") {
        campingsQuery += " AND camping_duration NOT LIKE ?";
        campingsParams.push("%לילה%");
      } else {
        campingsQuery += " AND camping_duration LIKE ?";
        campingsParams.push("%לילה%");
      }
    }

    // Filter by water activities
    if (likesWater === "true") {
      tripsQuery += " AND (trip_type LIKE ? OR trip_description LIKE ? OR trip_description LIKE ?)";
      tripsParams.push("%מים%", "%מים%", "%water%");
      
      campingsQuery += " AND camping_description LIKE ?";
      campingsParams.push("%מים%");
      
      attractionsQuery += " AND (attraction_type LIKE ? OR attraction_description LIKE ?)";
      attractionsParams.push("%ספורט מים%", "%מים%");
    }

    // Filter by accessibility
    if (isAccessible === "true") {
      const accessibilityTerms = ["%נגיש%", "%נגישות%", "%wheelchair%", "%♿%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < accessibilityTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(accessibilityTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < accessibilityTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(accessibilityTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < accessibilityTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(accessibilityTerms[i]);
      }
      attractionsQuery += ")";
    }

    // Filter by parking
    if (hasParking === "true") {
      const parkingTerms = ["%חניה%", "%חנייה%", "%parking%", "%🅿%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < parkingTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(parkingTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < parkingTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(parkingTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < parkingTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(parkingTerms[i]);
      }
      attractionsQuery += ")";
    }

    // Filter by services
    if (hasServices === "true") {
      const serviceTerms = ["%שירותים%", "%מקלחות%", "%facilities%", "%🚻%", "%🚿%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < serviceTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(serviceTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < serviceTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(serviceTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < serviceTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(serviceTerms[i]);
      }
      attractionsQuery += ")";
    }

    // Filter by romantic
    if (isRomantic === "true") {
      const romanticTerms = ["%רומנטי%", "%romantic%", "%❤%", "%💞%", "%💑%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < romanticTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(romanticTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < romanticTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(romanticTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < romanticTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(romanticTerms[i]);
      }
      attractionsQuery += ")";
    }

    // Filter by pet friendly
    if (isPetFriendly === "true") {
      const petTerms = ["%כלבים%", "%חיות מחמד%", "%pet%", "%dog%", "%🐕%", "%🐾%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < petTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(petTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < petTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(petTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < petTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(petTerms[i]);
      }
      attractionsQuery += ")";
    }
    
    // Filter by attraction type
    if (attractionType) {
      // Only apply to attractions
      attractionsQuery += " AND attraction_type LIKE ?";
      attractionsParams.push(`%${attractionType}%`);
    }
    
    // Filter by food options
    if (hasFoodOptions === "true") {
      const foodTerms = ["%מסעדה%", "%אוכל%", "%קפה%", "%food%", "%restaurant%", "%🍽️%", "%🍴%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < foodTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(foodTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < foodTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(foodTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < foodTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(foodTerms[i]);
      }
      attractionsQuery += ")";
    }
    
    // Filter by kid friendly
    if (isKidFriendly === "true") {
      const kidTerms = ["%ילדים%", "%משפחות%", "%משפחה%", "%children%", "%family%", "%👨‍👩‍👧‍👦%", "%👶%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < kidTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(kidTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < kidTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(kidTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < kidTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(kidTerms[i]);
      }
      attractionsQuery += ")";
    }
    
    // Filter by shade
    if (hasShade === "true") {
      const shadeTerms = ["%צל%", "%מוצל%", "%shade%", "%tree%", "%🌳%", "%🌲%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < shadeTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(shadeTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < shadeTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(shadeTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < shadeTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(shadeTerms[i]);
      }
      attractionsQuery += ")";
    }
    
    // Filter by guided tours
    if (hasGuidedTours === "true") {
      const tourTerms = ["%מדריך%", "%הדרכה%", "%סיור מודרך%", "%guided%", "%tour%", "%🧭%"];
      
      tripsQuery += " AND (";
      for (let i = 0; i < tourTerms.length; i++) {
        if (i > 0) tripsQuery += " OR ";
        tripsQuery += "trip_description LIKE ?";
        tripsParams.push(tourTerms[i]);
      }
      tripsQuery += ")";
      
      campingsQuery += " AND (";
      for (let i = 0; i < tourTerms.length; i++) {
        if (i > 0) campingsQuery += " OR ";
        campingsQuery += "camping_description LIKE ?";
        campingsParams.push(tourTerms[i]);
      }
      campingsQuery += ")";
      
      attractionsQuery += " AND (";
      for (let i = 0; i < tourTerms.length; i++) {
        if (i > 0) attractionsQuery += " OR ";
        attractionsQuery += "attraction_description LIKE ?";
        attractionsParams.push(tourTerms[i]);
      }
      attractionsQuery += ")";
    }
    
    // Filter by difficulty level
    if (difficultyLevel) {
      // Apply to trips and attractions
      tripsQuery += " AND trip_description LIKE ?";
      tripsParams.push(`%${difficultyLevel}%`);
      
      attractionsQuery += " AND attraction_description LIKE ?";
      attractionsParams.push(`%${difficultyLevel}%`);
    }

    console.log('Executing queries:');
    console.log('Trips query:', tripsQuery);
    console.log('Trips params:', tripsParams);
    console.log('Camping query:', campingsQuery);
    console.log('Camping params:', campingsParams);
    console.log('Attractions query:', attractionsQuery);
    console.log('Attractions params:', attractionsParams);

    // Execute all queries in parallel
    const [tripsResults, campingsResults, attractionsResults] = await Promise.all([
      db.query(tripsQuery, tripsParams),
      db.query(campingsQuery, campingsParams),
      db.query(attractionsQuery, attractionsParams)
    ]);

    // Extract results from the query responses and ensure proper field names
    // Log raw results for debugging
    console.log('Raw trips results:', JSON.stringify(tripsResults[0]?.slice(0, 1) || []));
    console.log('Raw camping results:', JSON.stringify(campingsResults[0]?.slice(0, 1) || []));
    console.log('Raw attraction results:', JSON.stringify(attractionsResults[0]?.slice(0, 1) || []));
    
    // Process trips results
    results.trips = (tripsResults[0] || []).map(trip => {
      // Make sure we have the correct image URL
      let imageUrl = trip.trip_img;
      if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
        imageUrl = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80';
      }
      
      return {
        ...trip,
        trip_id: trip.trip_id || trip._id || trip.id, // Ensure trip_id is set for proper routing
        _id: trip.trip_id || trip._id || trip.id, // Ensure _id is also set as backup
        trip_img: imageUrl // Use the processed image URL
      };
    });
    
    // Process camping results
    results.campings = (campingsResults[0] || []).map(camping => {
      // Make sure we have the correct image URL
      let imageUrl = camping.camping_img;
      if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
        imageUrl = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80';
      }
      
      return {
        ...camping,
        camping_id: camping.camping_id || camping._id || camping.id, // Ensure camping_id is set
        _id: camping.camping_id || camping._id || camping.id, // Ensure _id is also set as backup
        camping_img: imageUrl, // Use the processed image URL
        camping_location_name: camping.camping_location_name || 'Unknown Location' // Ensure location name exists
      };
    });
    
    // Process attraction results
    results.attractions = (attractionsResults[0] || []).map(attraction => {
      // Make sure we have the correct image URL
      let imageUrl = attraction.attraction_img;
      if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
        imageUrl = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1470&q=80';
      }
      
      return {
        ...attraction,
        attraction_id: attraction.attraction_id || attraction._id || attraction.id, // Ensure attraction_id is set
        _id: attraction.attraction_id || attraction._id || attraction.id, // Ensure _id is also set as backup
        attraction_img: imageUrl, // Use the processed image URL
        attraction_name: attraction.attraction_name || 'Unknown Attraction' // Ensure name exists
      };
    });
    
    // Log processed results for debugging
    console.log('Processed trips sample:', JSON.stringify(results.trips.slice(0, 1)));
    console.log('Processed camping sample:', JSON.stringify(results.campings.slice(0, 1)));
    console.log('Processed attractions sample:', JSON.stringify(results.attractions.slice(0, 1)));

    console.log(`Found ${results.trips.length} trips, ${results.campings.length} camping spots, and ${results.attractions.length} attractions`);

    // Return combined results
    res.json(results);
  } catch (error) {
    console.error("Error searching data:", error);
    res.status(500).json({ error: "Failed to search data", details: error.message });
  }
};
