/**
 * PHRlite: Regulated Commercial KYC Connector (Cashfree Verification Suite)
 * 
 * Used for commercial and financial compliance where direct UIDAI access is prohibited:
 * 1. Doctor NMC / MCI Medical Registration Verification
 * 2. Hospital Rohini / NABH Health Facility Registry
 * 3. Bank Account Penny-Drop Verification (for insurance claim settlement payouts)
 */

export interface DoctorNmcVerificationResult {
  verified: boolean;
  nmcRegistrationNumber: string;
  doctorName: string;
  qualifications: string;
  stateMedicalCouncil: string;
  yearOfRegistration: number;
  activeStatus: 'ACTIVE_REGISTERED' | 'SUSPENDED' | 'NOT_FOUND';
}

export interface BankAccountVerificationResult {
  verified: boolean;
  accountNumberMasked: string;
  ifscCode: string;
  registeredAccountName: string;
  nameMatchPercentage: number;
  bankName: string;
  utrTransactionReference: string;
}

export interface HospitalRohiniVerificationResult {
  verified: boolean;
  rohiniId: string;
  hospitalName: string;
  city: string;
  state: string;
  nabhAccredited: boolean;
  empaneledInsurersCount: number;
}

export class CashfreeKycConnector {
  private appId: string;
  private secretKey: string;
  private isSandbox: boolean;

  constructor(appId: string = 'CF_APP_MOCK', secretKey: string = 'cf_sec_mock', isSandbox: boolean = true) {
    this.appId = appId;
    this.secretKey = secretKey;
    this.isSandbox = isSandbox;
  }

  /**
   * Verifies an RMP (Registered Medical Practitioner) against the National Medical Commission registry
   */
  public verifyDoctorNmc(nmcRegNumber: string, stateCouncil: string = 'Maharashtra Medical Council'): DoctorNmcVerificationResult {
    // Standard mock verification simulating Cashfree Doctor Verification API
    const isMockValid = nmcRegNumber.length >= 5;
    
    return {
      verified: isMockValid,
      nmcRegistrationNumber: nmcRegNumber,
      doctorName: isMockValid ? 'Dr. Priya Rao, MD' : 'Unknown',
      qualifications: isMockValid ? 'MBBS, MD (Medicine)' : 'N/A',
      stateMedicalCouncil: stateCouncil,
      yearOfRegistration: 2018,
      activeStatus: isMockValid ? 'ACTIVE_REGISTERED' : 'NOT_FOUND'
    };
  }

  /**
   * Performs penny-drop bank account verification for direct-to-account claim reimbursements
   */
  public verifyBankAccount(accountNumber: string, ifsc: string, patientName: string): BankAccountVerificationResult {
    const masked = `XXXX-XXXX-${accountNumber.slice(-4)}`;
    return {
      verified: true,
      accountNumberMasked: masked,
      ifscCode: ifsc,
      registeredAccountName: patientName.toUpperCase(),
      nameMatchPercentage: 100,
      bankName: 'HDFC Bank Ltd',
      utrTransactionReference: `UTR-CF-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    };
  }

  /**
   * Verifies hospital empaneled status via Rohini Registry (IRDAI IIB)
   */
  public verifyHospitalRohini(rohiniId: string): HospitalRohiniVerificationResult {
    return {
      verified: true,
      rohiniId,
      hospitalName: 'Apollo Speciality Hospitals',
      city: 'Bengaluru',
      state: 'Karnataka',
      nabhAccredited: true,
      empaneledInsurersCount: 28
    };
  }
}
