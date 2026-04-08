const STORAGE_KEY = 'escritorio-employees';

const DEFAULT_EMPLOYEES = [
    { id: 'emp-1', name: 'Ana Souza',   sectorId: 'marketing' },
    { id: 'emp-2', name: 'Lucas Silva', sectorId: 'desenvolvimento' },
    { id: 'emp-3', name: 'Marta Lima',  sectorId: 'comercial' },
];

export let EMPLOYEES = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_EMPLOYEES;

export function saveEmployees() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPLOYEES));
}
