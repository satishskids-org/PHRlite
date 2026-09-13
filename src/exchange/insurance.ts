import type { FHIRCoverage } from '../core/types.ts';

/**
 * Creates a standard HL7 FHIR R4 Coverage resource for instant insurance handoff
 * Eliminates hospital receptionist paperwork and TPA desk queues.
 */
export function createInsuranceCoverage(params: {
  policyNumber: string;
  patientId: string;
  insurerName: string;
  insurerCode: string;
  policyType?: string;
  startDate: string;
  endDate: string;
  preAuthToken?: string;
}): FHIRCoverage {
  return {
    resourceType: 'Coverage',
    id: `cov-${params.policyNumber.replace(/[^a-zA-Z0-9]/g, '-')}`,
    status: 'active',
    subscriberId: params.policyNumber,
    beneficiary: `Patient/${params.patientId}`,
    payor: {
      name: params.insurerName,
      code: params.insurerCode,
    },
    period: {
      start: params.startDate,
      end: params.endDate,
    },
    policyType: params.policyType ?? 'Comprehensive Health Insurance',
    networkStatus: 'in-network',
    preAuthToken: params.preAuthToken,
  };
}

export interface CoverageValidationResult {
  valid: boolean;
  isActive: boolean;
  insurer: string;
  policyNumber: string;
  cashlessEligible: boolean;
  reason?: string;
}

/**
 * Fast-checks insurance eligibility on the provider terminal
 */
export function verifyInsuranceCoverage(coverage: FHIRCoverage): CoverageValidationResult {
  const now = new Date().toISOString();
  
  if (coverage.status !== 'active') {
    return {
      valid: false,
      isActive: false,
      insurer: coverage.payor.name,
      policyNumber: coverage.subscriberId,
      cashlessEligible: false,
      reason: `Policy status is '${coverage.status}', not active.`,
    };
  }

  if (now < coverage.period.start || now > coverage.period.end) {
    return {
      valid: false,
      isActive: false,
      insurer: coverage.payor.name,
      policyNumber: coverage.subscriberId,
      cashlessEligible: false,
      reason: `Policy expired on ${coverage.period.end}. Current date is ${now}.`,
    };
  }

  return {
    valid: true,
    isActive: true,
    insurer: coverage.payor.name,
    policyNumber: coverage.subscriberId,
    cashlessEligible: coverage.networkStatus === 'in-network' || !!coverage.preAuthToken,
  };
}
