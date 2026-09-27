export type MockIntegration = 'PHARMACY_SUBMISSION' | 'PROVIDER_NOTIFICATION' | 'PATIENT_NOTIFICATION' | 'INSURANCE_STATUS' | 'PHARMACY_FULFILLMENT';

export type MockResult = { integration: MockIntegration; succeeded: boolean; status: 'SIMULATED' | 'FAILED'; message: string; errorMessage?: string };

type MockInput = { refillId: string; forceFailure?: boolean };

function run(integration: MockIntegration, input: MockInput, successMessage: string): MockResult {
  if (input.forceFailure) return { integration, succeeded: false, status: 'FAILED', message: 'Simulated dependency failure.', errorMessage: `${integration} returned a deterministic demo failure. Retry is available.` };
  return { integration, succeeded: true, status: 'SIMULATED', message: successMessage };
}

export function submitPharmacyRefill(input: MockInput) { return run('PHARMACY_SUBMISSION', input, 'Simulated pharmacy submission accepted.'); }
export function notifyProvider(input: MockInput) { return run('PROVIDER_NOTIFICATION', input, 'Simulated provider notification delivered.'); }
export function notifyPharmacy(input: MockInput) { return run('PHARMACY_FULFILLMENT', input, 'Simulated pharmacy notification delivered.'); }
export function notifyPatient(input: MockInput) { return run('PATIENT_NOTIFICATION', input, 'Simulated patient notification delivered.'); }
export function checkInsurance(input: MockInput) { return run('INSURANCE_STATUS', input, 'Simulated insurance status check completed.'); }
export function fulfillPharmacy(input: MockInput) { return run('PHARMACY_FULFILLMENT', input, 'Simulated pharmacy fulfillment confirmed.'); }
