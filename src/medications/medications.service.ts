import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  MedicationResponseDto,
} from './dto';

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new medication
   */
  async createMedication(createMedicationDto: CreateMedicationDto): Promise<MedicationResponseDto> {
    const { name, price, discountedPrice, isActive = true } = createMedicationDto;

    // Check if medication name already exists
    const existingMedication = await this.prisma.medication.findUnique({
      where: { name }
    });
    if (existingMedication) {
      throw new ConflictException('Medication with this name already exists');
    }

    // Validate price
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      throw new BadRequestException('Price must be a positive number');
    }

    // Validate discounted price if provided
    if (discountedPrice) {
      const discountedPriceValue = parseFloat(discountedPrice);
      if (isNaN(discountedPriceValue) || discountedPriceValue <= 0) {
        throw new BadRequestException('Discounted price must be a positive number');
      }
      if (discountedPriceValue >= priceValue) {
        throw new BadRequestException('Discounted price must be less than regular price');
      }
    }

    // Create medication
    // standardPrice is required, use price value for it (price is legacy field)
    const medication = await this.prisma.medication.create({
      data: {
        name,
        standardPrice: price, // Required field
        price, // Legacy field, keep for backward compatibility
        discountedPrice: discountedPrice || null,
        isActive
      }
    });

    return medication;
  }

  /**
   * Get medication by ID
   */
  async findById(id: string): Promise<MedicationResponseDto> {
    const medication = await this.prisma.medication.findUnique({
      where: { id }
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  /**
   * Get all medications with optional filtering
   */
  async findAll(isActive?: boolean): Promise<MedicationResponseDto[]> {
    const where: any = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.medication.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Update medication
   */
  async updateMedication(id: string, updateMedicationDto: UpdateMedicationDto): Promise<MedicationResponseDto> {
    const medication = await this.prisma.medication.findUnique({
      where: { id }
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    // Check if new name conflicts with existing medication
    if (updateMedicationDto.name && updateMedicationDto.name !== medication.name) {
      const existingMedication = await this.prisma.medication.findUnique({
        where: { name: updateMedicationDto.name }
      });
      if (existingMedication) {
        throw new ConflictException('Medication with this name already exists');
      }
    }

    // Validate price if provided
    const priceValue = updateMedicationDto.price 
      ? parseFloat(updateMedicationDto.price)
      : parseFloat(medication.price.toString());
    
    if (updateMedicationDto.price) {
      const newPrice = parseFloat(updateMedicationDto.price);
      if (isNaN(newPrice) || newPrice <= 0) {
        throw new BadRequestException('Price must be a positive number');
      }
    }

    // Validate discounted price if provided
    if (updateMedicationDto.discountedPrice !== undefined) {
      if (updateMedicationDto.discountedPrice === null || updateMedicationDto.discountedPrice === '') {
        // Allow clearing the discounted price
        updateMedicationDto.discountedPrice = undefined;
      } else {
        const discountedPriceValue = parseFloat(updateMedicationDto.discountedPrice);
        if (isNaN(discountedPriceValue) || discountedPriceValue <= 0) {
          throw new BadRequestException('Discounted price must be a positive number');
        }
        if (discountedPriceValue >= priceValue) {
          throw new BadRequestException('Discounted price must be less than regular price');
        }
      }
    }

    // Update medication
    const updatedMedication = await this.prisma.medication.update({
      where: { id },
      data: updateMedicationDto
    });

    return updatedMedication;
  }

  /**
   * Delete medication
   */
  async deleteMedication(id: string): Promise<void> {
    const medication = await this.prisma.medication.findUnique({
      where: { id }
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    // Delete the medication
    await this.prisma.medication.delete({
      where: { id }
    });
  }

  /**
   * Map medication name to category based on medication type
   */
  private getMedicationCategory(medicationName: string): string {
    const name = medicationName.toLowerCase();
    
    // Hair Loss Treatments
    if (name.includes('finasteride') || name.includes('minoxidil')) {
      return 'Hair Loss Treatments';
    }
    
    // Hormone Optimization / TRT
    if (name.includes('testosterone') || name.includes('enclomiphene')) {
      return 'Hormone Optimization / TRT';
    }
    
    // Weight Loss & Obesity Medicine
    if (name.includes('semaglutide') || name.includes('tirzepatide')) {
      return 'Weight Loss & Obesity Medicine';
    }
    
    // Sexual Health
    if (name.includes('sildenafil') || name.includes('tadalafil')) {
      return 'Sexual Health';
    }
    
    // Peptides & Longevity
    if (name.includes('cjc') || name.includes('ipamorelin') || name.includes('sermorelin')) {
      return 'Peptides & Longevity';
    }
    
    // Supplements
    if (name.includes('vitamin') || name.includes('multivitamin')) {
      return 'Supplements';
    }
    
    // Default to Supplements for unknown medications
    return 'Supplements';
  }

  /**
   * Get medications grouped by category
   * Medications are categorized based on their names
   * Includes prescription fields (strength, dose, frequency, route, prescription) as null
   * since they're not stored in the Medication model
   */
  async getMedicationsByCategory(): Promise<Record<string, any[]>> {
    const medications = await this.prisma.medication.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Initialize all categories (matching frontend SERVICE_TABS)
    const categories: Record<string, any[]> = {
      'Hair Loss Treatments': [],
      'Hormone Optimization / TRT': [],
      'Weight Loss & Obesity Medicine': [],
      'Sexual Health': [],
      'Peptides & Longevity': [],
      'Lab Testing': [],
      'Supplements': [],
    };

    // Map medications - return ALL fields from the database
    medications.forEach(med => {
      // Return all fields from the database record (including strength, dose, frequency, route, prescription, etc.)
      // Using spread operator to include all fields automatically
      const medicationData = {
        ...med, // This includes ALL fields: id, name, price, standardPrice, discountedPrice, membershipPrice, 
                // isActive, strength, dose, frequency, route, prescription, directions, pricingNotes, createdAt, updatedAt
      };

      // Categorize medication
      const category = this.getMedicationCategory(med.name);
      if (categories[category]) {
        categories[category].push(medicationData);
      } else {
        // Fallback to Supplements if category not found
        categories['Supplements'].push(medicationData);
      }
    });

    // Remove empty categories to keep response clean
    Object.keys(categories).forEach(category => {
      if (categories[category].length === 0) {
        delete categories[category];
      }
    });

    return categories;
  }
}

