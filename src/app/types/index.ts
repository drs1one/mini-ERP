export interface Worker {
    matricule: string;
    full_name: string;
    hourly_rate: number;
    transport_rate: number;
}

export interface AttendanceLog {
    id?: number;
    matricule: string;
    date: string;
    total_hours: number;
    avance: number;
    credit: number;
}

export interface CalculationRequest {
    totalHours: number;
    hourlyRate: number;
    daysWorked: number;
    transportRatePerDay: number;
    avance: number;
    credit: number;
}

export interface CalculationResponse {
    success: boolean;
    baseSalary?: number;
    totalTransport?: number;
    totalDeductions?: number;
    totalNet?: number;
    error?: string;
}