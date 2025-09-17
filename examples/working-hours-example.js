/**
 * Working Hours API Usage Example
 * 
 * This script demonstrates how to use the new Working Hours API
 * to set up doctor availability and generate schedules.
 */

const API_BASE_URL = 'http://localhost:3000'; // Update with your API URL
const DOCTOR_ID = 'your-doctor-id-here'; // Replace with actual doctor ID
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${result.message || 'Unknown error'}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    throw error;
  }
}

// Example 1: Set working hours for a single day (Monday)
async function setSingleDayWorkingHours() {
  console.log('📅 Setting working hours for Monday...');
  
  const workingHours = {
    doctorId: DOCTOR_ID,
    dayOfWeek: 1, // Monday
    startTime: '08:00',
    endTime: '16:00',
    slotDuration: 20,
    breakDuration: 10,
    isActive: true
  };

  try {
    const result = await apiRequest('/working-hours', 'POST', workingHours);
    console.log('✅ Working hours created:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to create working hours:', error.message);
  }
}

// Example 2: Set working hours for multiple days
async function setMultipleDaysWorkingHours() {
  console.log('📅 Setting working hours for multiple days...');
  
  const workingHours = {
    doctorId: DOCTOR_ID,
    workingHours: [
      {
        dayOfWeek: 1, // Monday
        startTime: '08:00',
        endTime: '16:00',
        slotDuration: 20,
        breakDuration: 10,
        isActive: true
      },
      {
        dayOfWeek: 2, // Tuesday
        startTime: '08:00',
        endTime: '16:00',
        slotDuration: 20,
        breakDuration: 10,
        isActive: true
      },
      {
        dayOfWeek: 3, // Wednesday
        startTime: '08:00',
        endTime: '16:00',
        slotDuration: 20,
        breakDuration: 10,
        isActive: true
      },
      {
        dayOfWeek: 4, // Thursday
        startTime: '08:00',
        endTime: '16:00',
        slotDuration: 20,
        breakDuration: 10,
        isActive: true
      },
      {
        dayOfWeek: 5, // Friday
        startTime: '08:00',
        endTime: '16:00',
        slotDuration: 20,
        breakDuration: 10,
        isActive: true
      }
    ]
  };

  try {
    const result = await apiRequest('/working-hours/multiple', 'POST', workingHours);
    console.log('✅ Multiple working hours created:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to create multiple working hours:', error.message);
  }
}

// Example 3: Generate schedules from working hours
async function generateSchedules() {
  console.log('📅 Generating schedules from working hours...');
  
  const generateRequest = {
    doctorId: DOCTOR_ID,
    startDate: '2024-12-25',
    endDate: '2024-12-31',
    regenerateExisting: false
  };

  try {
    const result = await apiRequest('/working-hours/generate-schedules', 'POST', generateRequest);
    console.log('✅ Schedules generated:', result.data);
    console.log(`📊 Total schedules created: ${result.data.totalGenerated}`);
    
    if (result.data.calendarSync) {
      console.log(`📅 Google Calendar events created: ${result.data.calendarSync.eventsCreated}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Failed to generate schedules:', error.message);
  }
}

// Example 4: Get working hours
async function getWorkingHours() {
  console.log('📅 Getting working hours...');
  
  try {
    const result = await apiRequest(`/working-hours?doctorId=${DOCTOR_ID}`);
    console.log('✅ Working hours retrieved:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to get working hours:', error.message);
  }
}

// Example 5: Update working hours
async function updateWorkingHours(workingHoursId) {
  console.log('📅 Updating working hours...');
  
  const updateData = {
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    breakDuration: 15
  };

  try {
    const result = await apiRequest(`/working-hours/${workingHoursId}`, 'PUT', updateData);
    console.log('✅ Working hours updated:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to update working hours:', error.message);
  }
}

// Example 6: Get available slots for a specific date
async function getAvailableSlots(date) {
  console.log(`📅 Getting available slots for ${date}...`);
  
  try {
    const result = await apiRequest(`/schedules/available-slots?doctorId=${DOCTOR_ID}&date=${date}`);
    console.log('✅ Available slots:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to get available slots:', error.message);
  }
}

// Main execution function
async function main() {
  console.log('🚀 Working Hours API Example');
  console.log('============================\n');

  try {
    // Step 1: Set working hours for multiple days
    await setMultipleDaysWorkingHours();
    
    // Step 2: Get working hours to verify
    await getWorkingHours();
    
    // Step 3: Generate schedules for next week
    await generateSchedules();
    
    // Step 4: Get available slots for a specific date
    await getAvailableSlots('2024-12-25');
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
  }
}

// Run the example
if (require.main === module) {
  main();
}

module.exports = {
  setSingleDayWorkingHours,
  setMultipleDaysWorkingHours,
  generateSchedules,
  getWorkingHours,
  updateWorkingHours,
  getAvailableSlots
};
