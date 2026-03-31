import { LogService } from '../src/services/log.service';
import { ILogRepository } from '../src/repositories/log.repository';
import { IRequestLog } from '../src/models/request-log.model';

describe('LogService', () => {
  const mockLogData: IRequestLog = {
    method: 'GET',
    path: '/api/products',
    statusCode: 200,
    responseTime: 50,
    userId: 'user-1',
    targetService: 'product-service',
    timestamp: new Date()
  };

  describe('saveLog without repository', () => {
    it('should log to winston without error when no repository provided', () => {
      const logService = new LogService();
      expect(() => logService.saveLog(mockLogData)).not.toThrow();
    });
  });

  describe('saveLog with repository', () => {
    it('should persist log to repository via fire-and-forget', async () => {
      const mockRepo: ILogRepository = {
        save: jest.fn().mockResolvedValue(mockLogData),
        findAll: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0)
      };

      const logService = new LogService(mockRepo);
      logService.saveLog(mockLogData);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockRepo.save).toHaveBeenCalledWith(mockLogData);
    });

    it('should not throw when repository save fails', async () => {
      const mockRepo: ILogRepository = {
        save: jest.fn().mockRejectedValue(new Error('DB connection failed')),
        findAll: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0)
      };

      const logService = new LogService(mockRepo);
      expect(() => logService.saveLog(mockLogData)).not.toThrow();

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockRepo.save).toHaveBeenCalled();
    });
  });
});
