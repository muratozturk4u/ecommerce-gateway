export interface IHealthResponse {
  success: boolean;
  data: {
    service: string;
    status: string;
    timestamp: string;
  };
}

export interface IHealthController {
  getHealth(): IHealthResponse;
}
