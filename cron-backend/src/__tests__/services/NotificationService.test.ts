import axios from 'axios';
import NotificationService from '../../services/NotificationService';

// mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('notificationservice', () => {
    beforeEach(() => {
        // mock console log and error to prevent actual output
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        // restore all mocked functions after each test
        jest.restoreAllMocks();
    });

    it('should send notification successfully', async () => {
        // mock axios to return a successful response
        mockedAxios.mockResolvedValue({ status: 200, data: {} });

        // call notify method
        await NotificationService.notify('http://localhost:3000/test', 'POST', 'hello');

        // verify axios was called with correct parameters
        expect(mockedAxios).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'post',
                url: 'http://localhost:3000/test',
                data: expect.objectContaining({
                    message: expect.stringContaining('hello'),
                }),
            })
        );
    });

    it('should handle errors gracefully', async () => {
        // mock axios to throw an error
        mockedAxios.mockRejectedValue(new Error('network error'));

        // call notify and ensure it does not throw
        await expect(
            NotificationService.notify('http://localhost:3000/test', 'POST', 'hello')
        ).resolves.not.toThrow();

        // verify that console.error was called
        expect(console.error).toHaveBeenCalled();
    });
});
