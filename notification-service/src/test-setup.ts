import { Logger } from '@nestjs/common';

Logger.overrideLogger(false);

jest.mock('moment-timezone', () => {
    const moment = jest.requireActual('moment');
    return {
        ...moment,
        tz: jest.fn((timeZone?: string) => {
            const m = moment();
            m.tz = jest.fn(() => m);
            return m;
        }),
    };
});