const STORAGE_KEY = 'escritorio-employees';

const DEFAULT_EMPLOYEES = [
    { id: 'emp-1', name: 'Ana Souza',   sectorId: 'marketing', avatarFullKey: 'female-01-1' },
    { id: 'emp-2', name: 'Lucas Silva', sectorId: 'desenvolvimento', avatarFullKey: 'male-01-1' },
    { id: 'emp-3', name: 'Marta Lima',  sectorId: 'comercial', avatarFullKey: 'female-02-2' },
];

export let EMPLOYEES = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_EMPLOYEES;

export function saveEmployees() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPLOYEES));
}
