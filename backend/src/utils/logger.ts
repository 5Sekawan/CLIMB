/**
 * CLIMB Structured Logger
 * Provides consistent formatting for system, job, and error logs.
 */
export class Logger {
  private static format(level: 'INFO' | 'WARN' | 'ERROR' | 'JOB' | 'REQ', message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | Data: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  static info(message: string, meta?: any) {
    console.log(this.format('INFO', message, meta));
  }

  static warn(message: string, meta?: any) {
    console.warn(this.format('WARN', message, meta));
  }

  static error(message: string, error?: any) {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
      : error;
    console.error(this.format('ERROR', message, errorData));
  }

  static job(jobName: string, status: 'START' | 'DONE' | 'FAIL', message: string, meta?: any) {
    console.log(this.format('JOB', `[${jobName}] [${status}] ${message}`, meta));
  }

  static request(method: string, path: string, statusCode: number, duration: number, ip?: string) {
    const level = statusCode >= 400 ? 'WARN' : 'REQ';
    console.log(this.format(level, `${method} ${path} - ${statusCode} (${duration}ms) - IP: ${ip}`));
  }
}
