import { CategoryService } from '../src/services/category.service';
import { ICategoryRepository } from '../src/interfaces/category-repository.interface';
import { IProductRepository } from '../src/interfaces/product-repository.interface';
import { ICategoryDocument } from '../src/interfaces/category.interface';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockRepo: jest.Mocked<ICategoryRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  const mockCategory = {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    name: 'Elektronik',
    description: 'Elektronik urunler',
    createdAt: new Date('2026-03-28T10:00:00.000Z'),
    updatedAt: new Date('2026-03-28T10:00:00.000Z')
  } as unknown as ICategoryDocument;

  const mockCategory2 = {
    id: '507f1f77bcf86cd799439012',
    _id: '507f1f77bcf86cd799439012',
    name: 'Giyim',
    description: 'Giyim urunleri',
    createdAt: new Date('2026-03-28T10:00:00.000Z'),
    updatedAt: new Date('2026-03-28T10:00:00.000Z')
  } as unknown as ICategoryDocument;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    mockProductRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStock: jest.fn(),
      countByCategoryId: jest.fn()
    };
    categoryService = new CategoryService(mockRepo, mockProductRepo);
  });

  describe('getAll', () => {
    it('should return all categories', async () => {
      mockRepo.findAll.mockResolvedValue([mockCategory, mockCategory2]);

      const result = await categoryService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Elektronik');
      expect(result[1].name).toBe('Giyim');
    });

    it('should return empty array when no categories exist', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const result = await categoryService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return category when found', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);

      const result = await categoryService.getById('507f1f77bcf86cd799439011');

      expect(result.id).toBe(mockCategory.id);
      expect(result.name).toBe('Elektronik');
      expect(result.description).toBe('Elektronik urunler');
    });

    it('should throw 404 when category does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        categoryService.getById('507f1f77bcf86cd799439011')
      ).rejects.toEqual(
        expect.objectContaining({ status: 404, code: 'NOT_FOUND' })
      );
    });

    it('should throw 400 when id is not valid ObjectId', async () => {
      await expect(
        categoryService.getById('invalid-id')
      ).rejects.toEqual(
        expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' })
      );
    });
  });

  describe('create', () => {
    it('should create category and return it', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockCategory);

      const result = await categoryService.create({ name: 'Elektronik', description: 'Elektronik urunler' });

      expect(result.name).toBe('Elektronik');
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Elektronik', description: 'Elektronik urunler' });
    });

    it('should throw 409 when name already exists (exact match)', async () => {
      mockRepo.findByName.mockResolvedValue(mockCategory);

      await expect(
        categoryService.create({ name: 'Elektronik' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 409, code: 'CONFLICT' })
      );
    });

    it('should throw 409 when name already exists (case-insensitive)', async () => {
      mockRepo.findByName.mockResolvedValue(mockCategory);

      await expect(
        categoryService.create({ name: 'elektronik' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 409, code: 'CONFLICT' })
      );
    });

    it('should trim whitespace from name check', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockCategory);

      await categoryService.create({ name: '  Elektronik  ' });

      expect(mockRepo.findByName).toHaveBeenCalledWith('  Elektronik  ');
    });
  });

  describe('update', () => {
    it('should update category and return updated version', async () => {
      const updatedMock = { ...mockCategory, name: 'Updated' } as unknown as ICategoryDocument;
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue(updatedMock);

      const result = await categoryService.update('507f1f77bcf86cd799439011', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw 404 when category does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        categoryService.update('507f1f77bcf86cd799439011', { name: 'Updated' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 404, code: 'NOT_FOUND' })
      );
    });

    it('should throw 400 when id is not valid ObjectId', async () => {
      await expect(
        categoryService.update('invalid-id', { name: 'Updated' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' })
      );
    });

    it('should throw 409 when new name conflicts with another category', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockRepo.findByName.mockResolvedValue(mockCategory2);

      await expect(
        categoryService.update('507f1f77bcf86cd799439011', { name: 'Giyim' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 409, code: 'CONFLICT' })
      );
    });

    it('should NOT throw 409 when name matches same category (own name)', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockRepo.findByName.mockResolvedValue(mockCategory);
      mockRepo.update.mockResolvedValue(mockCategory);

      const result = await categoryService.update('507f1f77bcf86cd799439011', { name: 'Elektronik' });

      expect(result.name).toBe('Elektronik');
    });

    it('should allow updating only description', async () => {
      const updatedMock = { ...mockCategory, description: 'New desc' } as unknown as ICategoryDocument;
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockRepo.update.mockResolvedValue(updatedMock);

      const result = await categoryService.update('507f1f77bcf86cd799439011', { description: 'New desc' });

      expect(result.description).toBe('New desc');
      expect(mockRepo.findByName).not.toHaveBeenCalled();
    });

    it('should throw 409 for case-insensitive name collision', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockRepo.findByName.mockResolvedValue(mockCategory2);

      await expect(
        categoryService.update('507f1f77bcf86cd799439011', { name: 'giyim' })
      ).rejects.toEqual(
        expect.objectContaining({ status: 409, code: 'CONFLICT' })
      );
    });
  });

  describe('delete', () => {
    it('should delete category successfully', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockProductRepo.countByCategoryId.mockResolvedValue(0);
      mockRepo.delete.mockResolvedValue(mockCategory);

      await expect(categoryService.delete('507f1f77bcf86cd799439011')).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw 404 when category does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        categoryService.delete('507f1f77bcf86cd799439011')
      ).rejects.toEqual(
        expect.objectContaining({ status: 404, code: 'NOT_FOUND' })
      );
    });

    it('should throw 400 when id is not valid ObjectId', async () => {
      await expect(
        categoryService.delete('invalid-id')
      ).rejects.toEqual(
        expect.objectContaining({ status: 400, code: 'VALIDATION_ERROR' })
      );
    });

    it('should throw 409 when category has associated products (RESTRICT)', async () => {
      mockRepo.findById.mockResolvedValue(mockCategory);
      mockProductRepo.countByCategoryId.mockResolvedValue(3);

      await expect(
        categoryService.delete('507f1f77bcf86cd799439011')
      ).rejects.toEqual(
        expect.objectContaining({ status: 409, code: 'CONFLICT' })
      );
    });
  });
});
