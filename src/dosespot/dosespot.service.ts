import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DoseSpotPatientDto, DoseSpotSearchPatientDto } from './dto/dosespot-patient.dto';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as querystring from 'querystring';

@Injectable()
export class DoseSpotService {
  private readonly logger = new Logger(DoseSpotService.name);
  private readonly baseUrl: string;
  private readonly subscriptionKey: string;
  private readonly clinicId: string;
  private readonly clinicKey: string;
  private readonly userId: string;
  private readonly axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>('DOSESPOT_BASE_URL') || 'https://my.dosespot.com/webapi/v2';
    this.subscriptionKey = this.configService.get<string>('DOSESPOT_SUBSCRIPTION_KEY') || '84c770c2c47d18568621909839108c639c29f3978345122557a406433d766e17';
    this.clinicId = this.configService.get<string>('DOSESPOT_CLINIC_ID') || '';
    this.clinicKey = this.configService.get<string>('DOSESPOT_CLINIC_KEY') || '';
    this.userId = this.configService.get<string>('DOSESPOT_USER_ID') || '';

    if (!this.clinicId || !this.clinicKey || !this.userId) {
      this.logger.warn('DoseSpot credentials not fully configured. Please set DOSESPOT_CLINIC_ID, DOSESPOT_CLINIC_KEY, and DOSESPOT_USER_ID');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Add request interceptor to ensure subscription key is always included
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add subscription key as query parameter (required by Azure API Management)
        if (!config.params) {
          config.params = {};
        }
        config.params['subscription-key'] = this.subscriptionKey;
        
        // Add subscription key to headers as well
        if (config.headers) {
          config.headers['Subscription-Key'] = this.subscriptionKey;
        } else {
          config.headers = {
            'Subscription-Key': this.subscriptionKey,
          } as any;
        }
        
        // Add authorization token if available (for API calls, not token requests)
        if (config.url !== '/connect/token' && this.accessToken) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        this.logger.debug(`DoseSpot API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('DoseSpot API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`DoseSpot API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        // If 401 and we have credentials, try to refresh token
        if (error.response?.status === 401 && this.clinicId && this.clinicKey && this.userId) {
          this.logger.warn('Received 401, attempting to refresh token...');
          try {
            await this.getAccessToken(true); // Force refresh
            // Retry the original request
            const config = error.config;
            if (config.headers) {
              config.headers['Authorization'] = `Bearer ${this.accessToken}`;
            }
            return this.axiosInstance.request(config);
          } catch (refreshError) {
            this.logger.error('Failed to refresh token:', refreshError);
          }
        }
        
        this.logger.error('DoseSpot API Response Error:', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get access token from DoseSpot token endpoint
   * According to documentation: POST to /connect/token with form-urlencoded data
   */
  private async getAccessToken(forceRefresh: boolean = false): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    
    // Check if we have a valid token (tokens expire after 10 minutes = 600 seconds)
    // Refresh if less than 60 seconds remaining
    if (!forceRefresh && this.accessToken && this.tokenExpiry > now + 60) {
      return this.accessToken as string; // TypeScript guard: we've checked it's not null
    }

    if (!this.clinicId || !this.clinicKey || !this.userId) {
      throw new BadRequestException('DoseSpot credentials not configured. Please set DOSESPOT_CLINIC_ID, DOSESPOT_CLINIC_KEY, and DOSESPOT_USER_ID');
    }

    try {
      // Prepare form-urlencoded data according to documentation
      // Note: acr_values is optional for prescribing clinicians, required for proxies
      // Since we're getting "OnBehalfOfUser validation failed" error, we'll omit it
      // If you need proxy functionality, you'll need to get the correct OnBehalfOfUserId from DoseSpot
      const formData = querystring.stringify({
        client_id: this.clinicId,
        grant_type: 'password',
        client_secret: this.clinicKey,
        scope: 'api',
        username: this.userId,
        password: this.clinicKey,
        // acr_values is optional for prescribing clinicians
        // Only include if you're using proxy functionality:
        // acr_values: `OnBehalfOfUserId=${onBehalfOfUserId}`,
      });

      const response = await axios.post(
        `${this.baseUrl}/connect/token`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Subscription-Key': this.subscriptionKey,
          },
          params: {
            'subscription-key': this.subscriptionKey,
          },
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Tokens expire after 10 minutes (600 seconds), but we'll set expiry to 9 minutes to be safe
        this.tokenExpiry = now + 540; // 9 minutes
        this.logger.debug('DoseSpot access token obtained successfully');
        // At this point, accessToken is guaranteed to be a string
        return this.accessToken as string;
      } else {
        throw new BadRequestException('Invalid token response from DoseSpot');
      }
    } catch (error: any) {
      this.logger.error('Error obtaining DoseSpot access token:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.error_description || 
        error.response?.data?.error || 
        'Failed to obtain DoseSpot access token'
      );
    }
  }

  /**
   * Generate encrypted ClinicId for SSO
   * According to documentation section 1.6.1
   */
  private generateEncryptedClinicId(): { encrypted: string; randomPhrase: string } {
    // Step 1: Create a random 32-character alphanumeric phrase
    const randomPhrase = crypto.randomBytes(16).toString('hex').substring(0, 32);
    
    // Step 2: Append ClinicKey to random phrase
    const combined = randomPhrase + this.clinicKey;
    
    // Step 3: Get byte value from UTF8 string
    const bytes = Buffer.from(combined, 'utf8');
    
    // Step 4: Use SHA512 to hash
    const hash = crypto.createHash('sha512').update(bytes).digest();
    
    // Step 5: Get Base64String
    let base64Hash = hash.toString('base64');
    
    // Step 6: Remove '==' at the end if present
    if (base64Hash.endsWith('==')) {
      base64Hash = base64Hash.slice(0, -2);
    }
    
    // Step 7: Prepend random phrase to the hash
    const encrypted = randomPhrase + base64Hash;
    
    return { encrypted, randomPhrase };
  }

  /**
   * Generate encrypted UserId for SSO
   * According to documentation section 1.6.1
   */
  private generateEncryptedUserId(randomPhrase: string): string {
    // Step 1: Take first 22 characters of random phrase
    const phrase22 = randomPhrase.substring(0, 22);
    
    // Step 2: Append 22-char phrase to UserId
    const combined1 = this.userId + phrase22;
    
    // Step 3: Append ClinicKey
    const combined2 = combined1 + this.clinicKey;
    
    // Step 4: Get byte value
    const bytes = Buffer.from(combined2, 'utf8');
    
    // Step 5: Use SHA512 to hash
    const hash = crypto.createHash('sha512').update(bytes).digest();
    
    // Step 6: Get Base64String and remove '==' if present
    let base64Hash = hash.toString('base64');
    if (base64Hash.endsWith('==')) {
      base64Hash = base64Hash.slice(0, -2);
    }
    
    return base64Hash;
  }

  /**
   * Search for existing patient in DoseSpot
   */
  async searchPatient(searchDto: DoseSpotSearchPatientDto) {
    try {
      const token = await this.getAccessToken();
      
      // Format date for search (YYYY-MM-DD)
      const dob = new Date(searchDto.dateOfBirth).toISOString().split('T')[0];

      const response = await this.axiosInstance.get('/api/patients/search', {
        params: {
          firstname: searchDto.firstName,
          lastname: searchDto.lastName,
          dob: dob,
          patientStatus: 2, // Active patients
        },
      });

      this.logger.log(`Patient search completed: ${searchDto.firstName} ${searchDto.lastName}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Error searching patient in DoseSpot:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.ResultDescription || 
        error.response?.data?.message || 
        'Failed to search patient in DoseSpot'
      );
    }
  }

  /**
   * Validate and format phone number for DoseSpot
   * Must be 10 digits (US format: 3-digit area code + 7 digits)
   */
  private formatPhoneForDoseSpot(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    // Must be exactly 10 digits
    if (digits.length === 10) {
      return digits;
    }
    // If more than 10, take last 10
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    // If less than 10, return empty string (invalid)
    return '';
  }

  /**
   * Add new patient to DoseSpot
   */
  async addPatient(patientDto: DoseSpotPatientDto) {
    try {
      const token = await this.getAccessToken();
      
      // Convert date to ISO format
      const dateOfBirth = new Date(patientDto.dateOfBirth).toISOString();
      console.log('dateOfBirth', dateOfBirth);
      console.log('patientDto.primaryPhone', patientDto.primaryPhone);

      // Format phone numbers - must be valid 10-digit US format or empty string
      const primaryPhone = this.formatPhoneForDoseSpot(patientDto.primaryPhone);
      console.log('primaryPhone', primaryPhone);
      // Validate required fields
      if (!patientDto.address1 || !patientDto.city || !patientDto.zipCode || !primaryPhone) {
        throw new BadRequestException(
          'Required fields missing: Address1, City, ZipCode, and PrimaryPhone are required for DoseSpot'
        );
      }

      // Truncate NonDoseSpotMedicalRecordNumber to 35 characters max
      const medicalRecordNumber = (patientDto.nonDoseSpotMedicalRecordNumber || '').substring(0, 35);

      // Map full state name to abbreviation, then to StateID
      // Frontend sends full state names like "Alabama", "Florida", etc.
      const stateNameToAbbreviation: { [key: string]: string } = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
        'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
        'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
        'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
        'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
        'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
        'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
        'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
        'District of Columbia': 'DC', 'Puerto Rico': 'PR', 'Virgin Islands': 'VI', 'American Samoa': 'AS',
        'Guam': 'GU', 'Northern Mariana Islands': 'MP'
      };

      // Map US state abbreviation to StateID (DoseSpot requires numeric StateID)
      const stateAbbreviationToStateIdMap: { [key: string]: number } = {
        'AL': 1, 'AK': 2, 'AZ': 3, 'AR': 4, 'CA': 5, 'CO': 6, 'CT': 7, 'DE': 8, 'FL': 9, 'GA': 10,
        'HI': 11, 'ID': 12, 'IL': 13, 'IN': 14, 'IA': 15, 'KS': 16, 'KY': 17, 'LA': 18, 'ME': 19, 'MD': 20,
        'MA': 21, 'MI': 22, 'MN': 23, 'MS': 24, 'MO': 25, 'MT': 26, 'NE': 27, 'NV': 28, 'NH': 29, 'NJ': 30,
        'NM': 31, 'NY': 32, 'NC': 33, 'ND': 34, 'OH': 35, 'OK': 36, 'OR': 37, 'PA': 38, 'RI': 39, 'SC': 40,
        'SD': 41, 'TN': 42, 'TX': 43, 'UT': 44, 'VT': 45, 'VA': 46, 'WA': 47, 'WV': 48, 'WI': 49, 'WY': 50,
        'DC': 51, 'PR': 52, 'VI': 53, 'AS': 54, 'GU': 55, 'MP': 56
      };
      
      // Get StateID from state name or abbreviation
      let stateId: number | undefined = undefined;
      let stateAbbreviation: string | undefined = undefined;
      
      if (patientDto.state) {
        const stateTrimmed = patientDto.state.trim();
        
        // First try to match as full state name
        if (stateNameToAbbreviation[stateTrimmed]) {
          stateAbbreviation = stateNameToAbbreviation[stateTrimmed];
        } 
        // If not found, try as abbreviation (uppercase)
        else if (stateAbbreviationToStateIdMap[stateTrimmed.toUpperCase()]) {
          stateAbbreviation = stateTrimmed.toUpperCase();
        }
        
        // Get StateID from abbreviation
        if (stateAbbreviation) {
          stateId = stateAbbreviationToStateIdMap[stateAbbreviation];
        }
        
        if (!stateId) {
          this.logger.warn(`Unknown state: ${patientDto.state}, will try without StateID`);
        } else {
          this.logger.log(`Mapped state "${patientDto.state}" to abbreviation "${stateAbbreviation}" and StateID ${stateId}`);
        }
      }

      // Build payload - omit PhoneAdditional1 and PhoneAdditional2 entirely
      // DoseSpot doesn't accept empty strings for these fields, so we don't include them
      const payload: any = {
        Prefix: patientDto.prefix || '',
        FirstName: patientDto.firstName,
        MiddleName: patientDto.middleName || '',
        LastName: patientDto.lastName,
        Suffix: patientDto.suffix || '',
        DateOfBirth: dateOfBirth,
        Gender: patientDto.gender,
        Email: patientDto.email || '',
        Address1: patientDto.address1, // Required
        Address2: patientDto.address2 || '',
        City: patientDto.city, // Required
        State: stateAbbreviation || patientDto.state || '', // Use abbreviation if available, fallback to original
        StateID: stateId, // Required by DoseSpot - numeric state ID
        ZipCode: patientDto.zipCode, // Required
        PrimaryPhone: primaryPhone, // Required, must be valid 10-digit phone
        PrimaryPhoneType: patientDto.primaryPhoneType || 'Cell',
        Weight: patientDto.weight || 0,
        WeightMetric: patientDto.weightMetric || 'lb',
        Height: patientDto.height || 0,
        HeightMetric: patientDto.heightMetric || 'inch',
        NonDoseSpotMedicalRecordNumber: medicalRecordNumber, // Max 35 characters
        Active: true,
        Encounter: '',
        IsHospice: false,
      };

      // Note: PhoneAdditional1, PhoneAdditionalType1, PhoneAdditional2, PhoneAdditionalType2
      // are intentionally omitted - DoseSpot doesn't accept empty strings for these fields
      // If you need to add additional phone numbers in the future, format them and include them here

      const response = await this.axiosInstance.post('/api/patients', payload);
      console.log('response', response);
      
      // Check if DoseSpot returned an error
      if (response.data.Result && response.data.Result.ResultCode === 'ERROR') {
        const errorMessage = response.data.Result.ResultDescription || 'Unknown error from DoseSpot';
        this.logger.error(`DoseSpot patient creation failed: ${errorMessage}`);
        throw new BadRequestException(`Failed to create patient in DoseSpot: ${errorMessage}`);
      }
      
      // Validate that we got a valid patient ID
      if (!response.data.Id || response.data.Id === 0) {
        const errorMessage = response.data.Result?.ResultDescription || 'DoseSpot returned invalid patient ID';
        this.logger.error(`DoseSpot patient creation failed: ${errorMessage}, response: ${JSON.stringify(response.data)}`);
        throw new BadRequestException(`Failed to create patient in DoseSpot: ${errorMessage}`);
      }
      
      this.logger.log(`Patient added to DoseSpot: ${patientDto.firstName} ${patientDto.lastName}, ID: ${response.data.Id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Error adding patient to DoseSpot:', error.response?.data || error.message);
      
      // Provide more detailed error message
      if (error.response?.data?.ModelState) {
        const errors = Object.entries(error.response.data.ModelState)
          .map(([field, messages]: [string, any]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        throw new BadRequestException(`DoseSpot validation failed: ${errors}`);
      }
      
      throw new BadRequestException(
        error.response?.data?.ResultDescription || 
        error.response?.data?.message || 
        error.message ||
        'Failed to add patient to DoseSpot'
      );
    }
  }

  /**
   * Update existing patient in DoseSpot
   */
  async updatePatient(doseSpotPatientId: string, patientDto: Partial<DoseSpotPatientDto>) {
    try {
      const token = await this.getAccessToken();
      
      const payload: any = {};

      if (patientDto.firstName) payload.FirstName = patientDto.firstName;
      if (patientDto.middleName !== undefined) payload.MiddleName = patientDto.middleName || '';
      if (patientDto.lastName) payload.LastName = patientDto.lastName;
      if (patientDto.prefix !== undefined) payload.Prefix = patientDto.prefix || '';
      if (patientDto.suffix !== undefined) payload.Suffix = patientDto.suffix || '';
      if (patientDto.dateOfBirth) payload.DateOfBirth = new Date(patientDto.dateOfBirth).toISOString();
      if (patientDto.gender) payload.Gender = patientDto.gender;
      if (patientDto.email !== undefined) payload.Email = patientDto.email || '';
      if (patientDto.address1 !== undefined) payload.Address1 = patientDto.address1 || '';
      if (patientDto.address2 !== undefined) payload.Address2 = patientDto.address2 || '';
      if (patientDto.city !== undefined) payload.City = patientDto.city || '';
      if (patientDto.state !== undefined) payload.State = patientDto.state || '';
      if (patientDto.zipCode !== undefined) payload.ZipCode = patientDto.zipCode || '';
      if (patientDto.primaryPhone !== undefined) payload.PrimaryPhone = patientDto.primaryPhone || '';
      if (patientDto.weight !== undefined) payload.Weight = patientDto.weight || 0;
      if (patientDto.height !== undefined) payload.Height = patientDto.height || 0;

      const response = await this.axiosInstance.put(`/api/patients/${doseSpotPatientId}`, payload);

      this.logger.log(`Patient updated in DoseSpot: ${doseSpotPatientId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Error updating patient in DoseSpot:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.ResultDescription || 
        error.response?.data?.message || 
        'Failed to update patient in DoseSpot'
      );
    }
  }

  /**
   * Sync patient from our system to DoseSpot
   */
  async syncPatientToDoseSpot(patientId: string, forceUpdate: boolean = false) {
    try {
      // Get patient from our database
      const patient = await this.prisma.user.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      // Check if patient already synced
      if (patient.doseSpotPatientId && !forceUpdate) {
        this.logger.log(`Patient ${patientId} already synced to DoseSpot with ID: ${patient.doseSpotPatientId}`);
        return {
          doseSpotPatientId: patient.doseSpotPatientId,
          isNew: false,
          message: 'Patient already synced',
        };
      }

      // Validate required fields
      if (!patient.firstName || !patient.lastName) {
        throw new BadRequestException('Patient must have first name and last name to sync to DoseSpot');
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

      // Format phone number - must be valid 10-digit US format
      const primaryPhone = this.formatPhoneForDoseSpot(patient.primaryPhone || patient.phone);

      // Validate required fields for DoseSpot
      if (!address1 || !patient.city || !patient.zipcode || !primaryPhone) {
        throw new BadRequestException(
          `Patient missing required fields for DoseSpot sync: Address1, City, ZipCode, and PrimaryPhone are required. ` +
          `Current values: Address1=${address1 || 'missing'}, City=${patient.city || 'missing'}, ` +
          `ZipCode=${patient.zipcode || 'missing'}, PrimaryPhone=${primaryPhone || 'missing'}`
        );
      }

      const patientDto: DoseSpotPatientDto = {
        firstName: patient.firstName,
        middleName: patient.middleName || undefined,
        lastName: patient.lastName,
        prefix: patient.title || undefined,
        suffix: undefined,
        dateOfBirth,
        gender,
        email: patient.primaryEmail || patient.email || undefined,
        address1: address1, // Required
        address2: address2 || undefined,
        city: patient.city, // Required
        state: patient.state || undefined,
        zipCode: patient.zipcode, // Required
        primaryPhone: primaryPhone, // Required, validated
        primaryPhoneType: 'Cell',
        weight: undefined,
        weightMetric: 'lb',
        height: undefined,
        heightMetric: 'inch',
        nonDoseSpotMedicalRecordNumber: patientId.substring(0, 35), // Max 35 characters
      };

      // Search for existing patient
      let doseSpotPatientId: string | null = null;
      let isNew = true;

      try {
        const searchResult = await this.searchPatient({
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth,
        });

        console.log('searchResult', searchResult);

        if (searchResult.Items && searchResult.Items.length > 0) {
          // Convert to string - DoseSpot returns ID as number but Prisma expects string
          doseSpotPatientId = String(searchResult.Items[0].PatientId);
          isNew = false;
          this.logger.log(`Found existing patient in DoseSpot: ${doseSpotPatientId}`);

          if (forceUpdate && doseSpotPatientId) {
            await this.updatePatient(doseSpotPatientId, patientDto);
            this.logger.log(`Updated patient in DoseSpot: ${doseSpotPatientId}`);
          }
        }
      } catch (searchError) {
        this.logger.warn('Patient search failed, will create new patient');
      }

      console.log('doseSpotPatientId', doseSpotPatientId);
      // Create new patient if not found
      if (!doseSpotPatientId) {
        const createResult = await this.addPatient(patientDto);
        
        // Validate the response - check for errors and valid ID
        if (!createResult.Id || createResult.Id === 0) {
          const errorMessage = createResult.Result?.ResultDescription || 'DoseSpot returned invalid patient ID';
          this.logger.error(`Failed to create patient in DoseSpot: ${errorMessage}`);
          throw new BadRequestException(`Failed to create patient in DoseSpot: ${errorMessage}`);
        }
        
        // Convert to string - DoseSpot returns ID as number but Prisma expects string
        doseSpotPatientId = String(createResult.Id);
        isNew = true;
        this.logger.log(`Created new patient in DoseSpot: ${doseSpotPatientId}`);
      }
      
      // Final validation before saving
      if (!doseSpotPatientId || doseSpotPatientId === '0' || doseSpotPatientId === 'null') {
        throw new BadRequestException('Invalid DoseSpot patient ID. Cannot sync patient.');
      }

      // Update our database with DoseSpot patient ID (already converted to string)
      await this.prisma.user.update({
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
    } catch (error: any) {
      this.logger.error('Error syncing patient to DoseSpot:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Failed to sync patient to DoseSpot'
      );
    }
  }

  /**
   * Get DoseSpot patient ID for a patient
   */
  async getDoseSpotPatientId(patientId: string) {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { doseSpotPatientId: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return {
      doseSpotPatientId: patient.doseSpotPatientId,
      isSynced: !!patient.doseSpotPatientId,
    };
  }

  /**
   * Generate DoseSpot Jumpstart SSO URL for prescribing
   * According to documentation section 1.6.1
   */
  async generateJumpstartUrl(appointmentId: string, doctorId: string) {
    try {
      // Get appointment with patient and doctor info
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: true,
          doctor: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // Verify doctor owns this appointment
      if (appointment.doctorId !== doctorId) {
        throw new BadRequestException('Unauthorized to access this appointment');
      }

      // Check if patient is synced to DoseSpot
      if (!appointment.patient.doseSpotPatientId) {
        throw new BadRequestException('Patient must be synced to DoseSpot first. Please sync the patient before prescribing.');
      }

      // Note: Payment check removed - doctors can prescribe regardless of payment status
      // Some patients pay manually in person, so payment is not a requirement for prescribing

      // Validate configuration
      if (!this.clinicId || !this.clinicKey || !this.userId) {
        throw new BadRequestException('DoseSpot SSO configuration is missing. Please configure DOSESPOT_CLINIC_ID, DOSESPOT_CLINIC_KEY, and DOSESPOT_USER_ID');
      }

      // Generate encrypted IDs for SSO
      const { encrypted: encryptedClinicId, randomPhrase } = this.generateEncryptedClinicId();
      const encryptedUserId = this.generateEncryptedUserId(randomPhrase);

      // Build SSO URL according to documentation
      // Note: URLSearchParams automatically handles URL encoding
      const ssoParams = new URLSearchParams({
        SingleSignOnClinicId: this.clinicId,
        SingleSignOnUserId: this.userId,
        SingleSignOnPhraseLength: '32',
        SingleSignOnCode: encryptedClinicId,
        SingleSignOnUserIdVerify: encryptedUserId,
        PatientId: appointment.patient.doseSpotPatientId,
      });

      // Use LoginSingleSignOn.aspx endpoint as per documentation
      // The encrypted values are already URL-encoded by URLSearchParams
      const jumpstartUrl = `https://my.dosespot.com/LoginSingleSignOn.aspx?${ssoParams.toString()}`;

      this.logger.log(`Generated DoseSpot Jumpstart URL for appointment ${appointmentId}, patient ${appointment.patient.doseSpotPatientId}`);

      return {
        url: jumpstartUrl,
        patientId: appointment.patient.doseSpotPatientId,
        appointmentId,
      };
    } catch (error: any) {
      this.logger.error('Error generating DoseSpot Jumpstart URL:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Failed to generate DoseSpot Jumpstart URL'
      );
    }
  }
}
