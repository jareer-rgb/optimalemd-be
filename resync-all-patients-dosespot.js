const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
require('dotenv').config();

const prisma = new PrismaClient();

/**
 * Script to re-sync all patients to DoseSpot
 * This script directly calls DoseSpot API - no authentication needed
 * 
 * Make sure your .env file has the correct LIVE DoseSpot credentials:
 * - DOSESPOT_CLINIC_ID
 * - DOSESPOT_CLINIC_KEY  
 * - DOSESPOT_USER_ID
 * - DOSESPOT_BASE_URL (optional, defaults to production)
 * 
 * Usage: 
 *   node resync-all-patients-dosespot.js
 */

// DoseSpot API configuration
const baseUrl = process.env.DOSESPOT_BASE_URL || 'https://my.dosespot.com/webapi/v2';
const subscriptionKey = process.env.DOSESPOT_SUBSCRIPTION_KEY || '84c770c2c47d18568621909839108c639c29f3978345122557a406433d766e17';
const clinicId = process.env.DOSESPOT_CLINIC_ID || '';
const clinicKey = process.env.DOSESPOT_CLINIC_KEY || '';
const userId = process.env.DOSESPOT_USER_ID || '';

let accessToken = null;
let tokenExpiry = 0;

// Format phone number for DoseSpot (must be 10 digits)
function formatPhoneForDoseSpot(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return '';
}

// Get access token from DoseSpot
async function getAccessToken(forceRefresh = false) {
  const now = Math.floor(Date.now() / 1000);
  
  if (!forceRefresh && accessToken && tokenExpiry > now + 60) {
    return accessToken;
  }

  if (!clinicId || !clinicKey || !userId) {
    throw new Error('DoseSpot credentials not configured. Please set DOSESPOT_CLINIC_ID, DOSESPOT_CLINIC_KEY, and DOSESPOT_USER_ID');
  }

  try {
    const formData = querystring.stringify({
      client_id: clinicId,
      grant_type: 'password',
      client_secret: clinicKey,
      scope: 'api',
      username: userId,
      password: clinicKey,
    });

    const response = await axios.post(
      `${baseUrl}/connect/token`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Subscription-Key': subscriptionKey,
        },
        params: {
          'subscription-key': subscriptionKey,
        },
      }
    );

    if (response.data && response.data.access_token) {
      accessToken = response.data.access_token;
      tokenExpiry = now + 540; // 9 minutes
      return accessToken;
    } else {
      throw new Error('Invalid token response from DoseSpot');
    }
  } catch (error) {
    throw new Error(
      error.response?.data?.error_description || 
      error.response?.data?.error || 
      'Failed to obtain DoseSpot access token'
    );
  }
}

// Search for patient in DoseSpot
async function searchPatient(firstName, lastName, dateOfBirth) {
  try {
    const token = await getAccessToken();
    const dob = new Date(dateOfBirth).toISOString().split('T')[0];

    const response = await axios.get(`${baseUrl}/api/patients/search`, {
      params: {
        firstname: firstName,
        lastname: lastName,
        dob: dob,
        patientStatus: 2, // Active patients
        'subscription-key': subscriptionKey,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Subscription-Key': subscriptionKey,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.ResultDescription || 
      error.response?.data?.message || 
      'Failed to search patient in DoseSpot'
    );
  }
}

// Add new patient to DoseSpot
async function addPatient(patientDto) {
  try {
    const token = await getAccessToken();
    const dateOfBirth = new Date(patientDto.dateOfBirth).toISOString();
    const primaryPhone = formatPhoneForDoseSpot(patientDto.primaryPhone);

    if (!patientDto.address1 || !patientDto.city || !patientDto.zipCode || !primaryPhone) {
      throw new Error('Required fields missing: Address1, City, ZipCode, and PrimaryPhone are required for DoseSpot');
    }

    const payload = {
      FirstName: patientDto.firstName,
      LastName: patientDto.lastName,
      DateOfBirth: dateOfBirth,
      Gender: patientDto.gender,
      Address1: patientDto.address1,
      City: patientDto.city,
      State: patientDto.state || '',
      ZipCode: patientDto.zipCode,
      PrimaryPhone: primaryPhone,
      PrimaryPhoneType: patientDto.primaryPhoneType || 'Cell',
      NonDoseSpotMedicalRecordNumber: patientDto.nonDoseSpotMedicalRecordNumber || '',
      Active: true, // Required field for DoseSpot API
    };

    if (patientDto.middleName) payload.MiddleName = patientDto.middleName;
    if (patientDto.email) payload.Email = patientDto.email;
    if (patientDto.address2) payload.Address2 = patientDto.address2;

    const response = await axios.post(`${baseUrl}/api/patients`, payload, {
      params: {
        'subscription-key': subscriptionKey,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    const errorDetails = error.response?.data;
    let errorMessage = 'Failed to add patient to DoseSpot';
    
    if (errorDetails) {
      if (errorDetails.Result?.ResultDescription) {
        errorMessage = errorDetails.Result.ResultDescription;
      } else if (errorDetails.Message) {
        errorMessage = errorDetails.Message;
        if (errorDetails.ModelState) {
          const modelStateErrors = Object.values(errorDetails.ModelState).flat().join(', ');
          errorMessage += ` - ${modelStateErrors}`;
        }
      } else if (errorDetails.message) {
        errorMessage = errorDetails.message;
      }
    }
    
    throw new Error(errorMessage);
  }
}

// Update patient in DoseSpot
async function updatePatient(doseSpotPatientId, patientDto) {
  try {
    const token = await getAccessToken();
    const dateOfBirth = new Date(patientDto.dateOfBirth).toISOString();
    const primaryPhone = formatPhoneForDoseSpot(patientDto.primaryPhone);

    const payload = {
      FirstName: patientDto.firstName,
      LastName: patientDto.lastName,
      DateOfBirth: dateOfBirth,
      Gender: patientDto.gender,
      Address1: patientDto.address1,
      City: patientDto.city,
      State: patientDto.state || '',
      ZipCode: patientDto.zipCode,
      PrimaryPhone: primaryPhone,
      PrimaryPhoneType: patientDto.primaryPhoneType || 'Cell',
    };

    if (patientDto.middleName) payload.MiddleName = patientDto.middleName;
    if (patientDto.email) payload.Email = patientDto.email;
    if (patientDto.address2) payload.Address2 = patientDto.address2;

    const response = await axios.put(`${baseUrl}/api/patients/${doseSpotPatientId}`, payload, {
      params: {
        'subscription-key': subscriptionKey,
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.Result?.ResultDescription || 
      error.response?.data?.message || 
      'Failed to update patient in DoseSpot'
    );
  }
}

// Sync patient to DoseSpot (main logic)
async function syncPatientToDoseSpot(patientId, forceUpdate = false) {
  // Get patient from database
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Validate required fields
  if (!patient.firstName || !patient.lastName) {
    throw new Error('Patient must have first name and last name to sync to DoseSpot');
  }

  const dateOfBirth = patient.dateOfBirth 
    ? new Date(patient.dateOfBirth).toISOString() 
    : new Date('1990-01-01').toISOString();
  
  // Map gender: 1=Male, 2=Female, 3=Unknown
  let gender = 3;
  if (patient.gender) {
    const genderLower = patient.gender.toLowerCase();
    if (genderLower === 'male' || genderLower === 'm' || genderLower === '1') {
      gender = 1;
    } else if (genderLower === 'female' || genderLower === 'f' || genderLower === '2') {
      gender = 2;
    }
  }

  // Parse address
  let address1 = '';
  let address2 = '';
  if (patient.completeAddress) {
    const addressParts = patient.completeAddress.split(',').map(s => s.trim());
    address1 = addressParts[0] || '';
    address2 = addressParts.slice(1).join(', ') || '';
  }

  const primaryPhone = formatPhoneForDoseSpot(patient.primaryPhone || patient.phone);

  // Validate required fields for DoseSpot
  if (!address1 || !patient.city || !patient.zipcode || !primaryPhone) {
    throw new Error(
      `Patient missing required fields: Address1, City, ZipCode, and PrimaryPhone are required. ` +
      `Current values: Address1=${address1 || 'missing'}, City=${patient.city || 'missing'}, ` +
      `ZipCode=${patient.zipcode || 'missing'}, PrimaryPhone=${primaryPhone || 'missing'}`
    );
  }

  const patientDto = {
    firstName: patient.firstName,
    middleName: patient.middleName || undefined,
    lastName: patient.lastName,
    dateOfBirth,
    gender,
    email: patient.primaryEmail || patient.email || undefined,
    address1: address1,
    address2: address2 || undefined,
    city: patient.city,
    state: patient.state || undefined,
    zipCode: patient.zipcode,
    primaryPhone: primaryPhone,
    primaryPhoneType: 'Cell',
    nonDoseSpotMedicalRecordNumber: patientId.substring(0, 35),
  };

  // Search for existing patient
  let doseSpotPatientId = null;
  let isNew = true;

  try {
    const searchResult = await searchPatient(
      patient.firstName,
      patient.lastName,
      dateOfBirth
    );

    if (searchResult.Items && searchResult.Items.length > 0) {
      doseSpotPatientId = String(searchResult.Items[0].PatientId);
      isNew = false;

      if (forceUpdate && doseSpotPatientId) {
        await updatePatient(doseSpotPatientId, patientDto);
      }
    }
  } catch (searchError) {
    // Patient search failed, will create new patient
  }

  // Create new patient if not found
  if (!doseSpotPatientId) {
    const createResult = await addPatient(patientDto);
    
    if (!createResult.Id || createResult.Id === 0) {
      const errorMessage = createResult.Result?.ResultDescription || 'DoseSpot returned invalid patient ID';
      throw new Error(`Failed to create patient in DoseSpot: ${errorMessage}`);
    }
    
    doseSpotPatientId = String(createResult.Id);
    isNew = true;
  }
  
  // Final validation
  if (!doseSpotPatientId || doseSpotPatientId === '0' || doseSpotPatientId === 'null') {
    throw new Error('Invalid DoseSpot patient ID. Cannot sync patient.');
  }

  // Update database with DoseSpot patient ID
  await prisma.user.update({
    where: { id: patientId },
    data: {
      doseSpotPatientId,
    },
  });

  return {
    doseSpotPatientId,
    isNew,
    message: isNew ? 'Patient created in DoseSpot' : 'Patient found in DoseSpot',
  };
}

// Main function
async function resyncAllPatientsToDoseSpot() {
  try {
    console.log('🚀 Starting DoseSpot re-sync for all patients...\n');
    console.log('⚠️  Make sure your .env has LIVE DoseSpot credentials\n');

    // Validate credentials
    if (!clinicId || !clinicKey || !userId) {
      console.error('❌ ERROR: DoseSpot credentials not configured!');
      console.error('   Please set DOSESPOT_CLINIC_ID, DOSESPOT_CLINIC_KEY, and DOSESPOT_USER_ID in your .env file\n');
      process.exit(1);
    }

    console.log('✅ DoseSpot credentials found\n');

    // Get only patients without DoseSpot ID (regardless of email verification status)
    const patients = await prisma.user.findMany({
      where: {
        doseSpotPatientId: null, // Only sync patients that don't have a DoseSpot ID
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryEmail: true,
        email: true,
        doseSpotPatientId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 Found ${patients.length} patients to sync\n`);

    if (patients.length === 0) {
      console.log('No patients found to sync.');
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    const failedPatients = [];

    // Process patients one by one
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const patientEmail = patient.primaryEmail || patient.email || 'No email';
      const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
      
      console.log(`[${i + 1}/${patients.length}] Syncing patient: ${patientName} (${patientEmail})...`);

      try {
        const result = await syncPatientToDoseSpot(patient.id, true);
        
        if (result && result.doseSpotPatientId) {
          console.log(`  ✅ Success! DoseSpot ID: ${result.doseSpotPatientId} (${result.isNew ? 'New' : 'Updated'})`);
          successCount++;
        } else {
          console.log(`  ⚠️  Warning: Sync completed but no DoseSpot ID returned`);
          failureCount++;
          failedPatients.push({
            id: patient.id,
            name: patientName,
            email: patientEmail,
            error: 'No DoseSpot ID returned',
          });
        }
      } catch (error) {
        let errorMessage = error.message || error.toString();
        
        // Add more detailed error information if available
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          errorMessage = `HTTP ${status}: ${errorMessage}`;
          
          if (data && data.ModelState) {
            const modelStateErrors = Object.values(data.ModelState).flat().join(', ');
            errorMessage += ` (${modelStateErrors})`;
          }
        }
        
        console.error(`  ❌ Failed: ${errorMessage}`);
        failureCount++;
        failedPatients.push({
          id: patient.id,
          name: patientName,
          email: patientEmail,
          error: errorMessage,
        });
      }

      // Add a small delay to avoid overwhelming the API
      if (i < patients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total patients: ${patients.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`Success rate: ${((successCount / patients.length) * 100).toFixed(2)}%`);

    if (failedPatients.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('❌ FAILED PATIENTS');
      console.log('='.repeat(60));
      failedPatients.forEach((patient, index) => {
        console.log(`\n${index + 1}. ${patient.name}`);
        console.log(`   Email: ${patient.email}`);
        console.log(`   Patient ID: ${patient.id}`);
        console.log(`   Error: ${patient.error}`);
      });
      console.log('\n' + '='.repeat(60));
      console.log(`\n📧 Failed Patient Emails (${failedPatients.length} total):`);
      console.log('='.repeat(60));
      failedPatients.forEach((patient) => {
        console.log(patient.email);
      });
    } else {
      console.log('\n🎉 All patients synced successfully!');
    }

    console.log('\n✅ Script completed');
  } catch (error) {
    console.error('❌ Error in resync script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resyncAllPatientsToDoseSpot()
  .then(() => {
    console.log('\n✨ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
