export type StationCategory =
    | 'tracage'
    | '5yata'
    | 'sourgi'
    | 'finisio'
    | 'control'
    | 'planxa';

export interface StationConfig {
    key: StationCategory;
    name: string;
    sequenceOrder: number;
    description: string;
}

export const WORKSHOP_STATIONS: StationConfig[] = [
    { key: 'tracage', name: 'Traçage', sequenceOrder: 1, description: 'Marking and cutting prep' },
    { key: '5yata', name: '5yata', sequenceOrder: 2, description: 'Main straight-stitch sewing' },
    { key: 'sourgi', name: 'Sourgi', description: 'Overlock and edge finishing', sequenceOrder: 3 },
    { key: 'finisio', name: 'Finisio', description: 'First inspection and thread trimming', sequenceOrder: 4 },
    { key: 'control', name: 'Control', description: 'Final quality inspection', sequenceOrder: 5 },
    { key: 'planxa', name: 'Planxa', description: 'Pressing and ironing', sequenceOrder: 6 },
];