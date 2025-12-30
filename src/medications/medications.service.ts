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
    const medication = await this.prisma.medication.create({
      data: {
        name,
        price,
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
}

