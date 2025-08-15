import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { WebhookController } from './controllers/webhook.controller';
import { LogService } from './services/log.service';

describe('AppModule', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
    });

    it('should compile the module', () => {
        expect(module).toBeDefined();
    });

    it('should have WebhookController', () => {
        const controller = module.get<WebhookController>(WebhookController);
        expect(controller).toBeDefined();
    });

    it('should have LogService', () => {
        const service = module.get<LogService>(LogService);
        expect(service).toBeDefined();
    });
});