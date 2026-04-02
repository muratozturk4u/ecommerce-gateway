import { ProductService } from '../src/services/product.service';
import { IProductRepository } from '../src/interfaces/product-repository.interface';
import { ICategoryRepository } from '../src/interfaces/category-repository.interface';
import { IProductDocument, ProductQuery } from '../src/interfaces/product.interface';
import { ICategoryDocument } from '../src/interfaces/category.interface';

const mockProductRepository: jest.Mocked<IProductRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStock: jest.fn(),
  countByCategoryId: jest.fn(),
};

const mockCategoryRepository: jest.Mocked<ICategoryRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockProduct = {
  id: '507f1f77bcf86cd799439011',
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Product',
  description: 'Test description',
  price: 100,
  stock: 50,
  categoryId: '507f1f77bcf86cd799439012',
  imageUrl: 'https://example.com/image.jpg',
  isActive: true,
  createdAt: new Date('2026-03-28T10:00:00.000Z'),
  updatedAt: new Date('2026-03-28T10:00:00.000Z'),
} as unknown as IProductDocument;

const mockCategoryDoc = {
  id: '507f1f77bcf86cd799439012',
  name: 'Elektronik',
} as unknown as ICategoryDocument;

const defaultQuery: ProductQuery = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductService(mockProductRepository, mockCategoryRepository);
  });

  describe('getAll', () => {
    it('should return paginated products with default params', async () => {
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      const result = await service.getAll(defaultQuery);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(defaultQuery);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockProduct.id);
      expect(result.data[0].name).toBe('Test Product');
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('should return empty array when no products', async () => {
      mockProductRepository.findAll.mockResolvedValue({ docs: [], total: 0 });

      const result = await service.getAll(defaultQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by text search', async () => {
      const query: ProductQuery = { ...defaultQuery, search: 'laptop' };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by categoryId', async () => {
      const query: ProductQuery = { ...defaultQuery, categoryId: '507f1f77bcf86cd799439012' };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by price range (minPrice + maxPrice)', async () => {
      const query: ProductQuery = { ...defaultQuery, minPrice: 50, maxPrice: 200 };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by minPrice only', async () => {
      const query: ProductQuery = { ...defaultQuery, minPrice: 50 };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should filter by maxPrice only', async () => {
      const query: ProductQuery = { ...defaultQuery, maxPrice: 200 };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should throw 400 when minPrice > maxPrice', async () => {
      const query: ProductQuery = { ...defaultQuery, minPrice: 300, maxPrice: 100 };

      await expect(service.getAll(query)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' })
      );
      expect(mockProductRepository.findAll).not.toHaveBeenCalled();
    });

    it('should sort by name ascending', async () => {
      const query: ProductQuery = { ...defaultQuery, sortBy: 'name' as const, sortOrder: 'asc' as const };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should sort by price descending', async () => {
      const query: ProductQuery = { ...defaultQuery, sortBy: 'price' as const, sortOrder: 'desc' as const };
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 1 });

      await service.getAll(query);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should calculate totalPages correctly (total=25, limit=10 -> totalPages=3)', async () => {
      mockProductRepository.findAll.mockResolvedValue({ docs: [mockProduct], total: 25 });

      const result = await service.getAll(defaultQuery);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return totalPages=0 when no results', async () => {
      mockProductRepository.findAll.mockResolvedValue({ docs: [], total: 0 });

      const result = await service.getAll(defaultQuery);

      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return product when found', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.getById('507f1f77bcf86cd799439011');

      expect(result.id).toBe(mockProduct.id);
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(100);
      expect(mockProductRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw 404 when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.getById('507f1f77bcf86cd799439011')).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
    });

    it('should throw 400 when id is invalid ObjectId', async () => {
      await expect(service.getById('invalid-id')).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' })
      );
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Product',
      description: 'New description',
      price: 150,
      stock: 30,
      categoryId: '507f1f77bcf86cd799439012',
      imageUrl: 'https://example.com/new.jpg',
    };

    it('should create product with all fields', async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockCategoryDoc);
      mockProductRepository.create.mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(mockProductRepository.create).toHaveBeenCalledWith(createDto);
      expect(result.id).toBe(mockProduct.id);
    });

    it('should create product without categoryId', async () => {
      const dtoWithoutCategory = { name: 'Simple Product', price: 50, stock: 10 };
      mockProductRepository.create.mockResolvedValue(mockProduct);

      const result = await service.create(dtoWithoutCategory);

      expect(mockCategoryRepository.findById).not.toHaveBeenCalled();
      expect(mockProductRepository.create).toHaveBeenCalledWith(dtoWithoutCategory);
      expect(result.id).toBe(mockProduct.id);
    });

    it('should validate categoryId exists when provided (category found)', async () => {
      mockCategoryRepository.findById.mockResolvedValue(mockCategoryDoc);
      mockProductRepository.create.mockResolvedValue(mockProduct);

      await service.create(createDto);

      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(mockProductRepository.create).toHaveBeenCalled();
    });

    it('should throw 400 when categoryId does not exist', async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' })
      );
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Product',
      price: 200,
    };

    it('should update product successfully', async () => {
      const updatedDoc = { ...mockProduct, name: 'Updated Product', price: 200 } as unknown as IProductDocument;
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue(updatedDoc);

      const result = await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(mockProductRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockProductRepository.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', updateDto);
      expect(result.name).toBe('Updated Product');
      expect(result.price).toBe(200);
    });

    it('should throw 404 when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.update('507f1f77bcf86cd799439011', updateDto)).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('should validate new categoryId when provided', async () => {
      const updateWithCategory = { ...updateDto, categoryId: '507f1f77bcf86cd799439012' };
      const updatedDoc = { ...mockProduct, ...updateWithCategory } as unknown as IProductDocument;
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue(mockCategoryDoc);
      mockProductRepository.update.mockResolvedValue(updatedDoc);

      await service.update('507f1f77bcf86cd799439011', updateWithCategory);

      expect(mockCategoryRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(mockProductRepository.update).toHaveBeenCalled();
    });

    it('should throw 400 when new categoryId does not exist', async () => {
      const updateWithBadCategory = { ...updateDto, categoryId: '507f1f77bcf86cd799439012' };
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.update('507f1f77bcf86cd799439011', updateWithBadCategory)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' })
      );
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete product successfully', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.delete.mockResolvedValue(mockProduct);

      await service.delete('507f1f77bcf86cd799439011');

      expect(mockProductRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockProductRepository.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw 404 when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.delete('507f1f77bcf86cd799439011')).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
      expect(mockProductRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    it('should increase stock', async () => {
      const updatedDoc = { ...mockProduct, stock: 60 } as unknown as IProductDocument;
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.updateStock.mockResolvedValue(updatedDoc);

      const result = await service.updateStock('507f1f77bcf86cd799439011', 10);

      expect(mockProductRepository.updateStock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 10);
      expect(result.stock).toBe(60);
    });

    it('should decrease stock (valid)', async () => {
      const updatedDoc = { ...mockProduct, stock: 40 } as unknown as IProductDocument;
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.updateStock.mockResolvedValue(updatedDoc);

      const result = await service.updateStock('507f1f77bcf86cd799439011', -10);

      expect(mockProductRepository.updateStock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', -10);
      expect(result.stock).toBe(40);
    });

    it('should allow stock to reach exactly 0', async () => {
      const updatedDoc = { ...mockProduct, stock: 0 } as unknown as IProductDocument;
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.updateStock.mockResolvedValue(updatedDoc);

      const result = await service.updateStock('507f1f77bcf86cd799439011', -50);

      expect(mockProductRepository.updateStock).toHaveBeenCalledWith('507f1f77bcf86cd799439011', -50);
      expect(result.stock).toBe(0);
    });

    it('should throw INSUFFICIENT_STOCK when stock would go negative', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      await expect(service.updateStock('507f1f77bcf86cd799439011', -51)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INSUFFICIENT_STOCK' })
      );
      expect(mockProductRepository.updateStock).not.toHaveBeenCalled();
    });

    it('should throw 404 when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.updateStock('507f1f77bcf86cd799439011', 10)).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
      expect(mockProductRepository.updateStock).not.toHaveBeenCalled();
    });

    it('should handle concurrent stock update failure (updateStock returns null)', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.updateStock.mockResolvedValue(null);

      await expect(service.updateStock('507f1f77bcf86cd799439011', -10)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INSUFFICIENT_STOCK' })
      );
    });
  });
});
