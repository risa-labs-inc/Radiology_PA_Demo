import { useNavigate, useParams } from 'react-router-dom'
import { getOrderByMRN } from '../../utils/patientDataHelpers'

export default function PatientEV() {
  const navigate = useNavigate()
  const { id } = useParams()

  // Get order data using MRN from URL params
  const orderData = getOrderByMRN(id!)

  const handleGoBack = () => {
    navigate('/')
  }

  const handleContinue = () => {
    navigate(`/patient/${id}/dynamics`)
  }

  // Show loading/error state if no order data
  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No patient data found for MRN: {id}</p>
          <button
            onClick={handleGoBack}
            className="mt-4 px-6 py-2 text-sm border border-gray-300 bg-white rounded hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const patient = orderData.patient
  const order = orderData.order
  const payer = orderData.payer
  const eligibility = orderData.eligibilityVerification
  const provider = order.orderingProvider

  // Calculate remaining amounts
  const deductibleRemaining = eligibility.financials.deductible.total - eligibility.financials.deductible.used
  const outOfPocketRemaining = eligibility.financials.outOfPocket.total - eligibility.financials.outOfPocket.used

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">{patient.name.toUpperCase()} ({patient.mrn})</h1>
          </div>
          <div className="flex gap-3">
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Patient Details */}
          <div className="col-span-3 space-y-3 pr-6 border-r border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Patient & Order Context</h2>
            <div className="space-y-2">
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">Date of Birth</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">
                {patient.dob
                  ? new Date(patient.dob).toLocaleDateString('en-US')
                  : 'N/A'}
              </span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">Member ID</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">{patient.memberId}</span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">
                {order.imagingModality === 'Surgery' ? 'Type' : 'Imaging Type'}
              </span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">{order.imagingType}</span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">CPT Code(s)</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">{order.cptCodes.join(', ')}</span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">Date of Service</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">
                {new Date(order.dateOfService).toLocaleDateString('en-US')}
              </span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">Ordering Provider</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">{provider.name}</span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">Provider NPI</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">{provider.npi}</span>
            </div>
            <div className="flex text-sm">
              <span className="text-gray-600 w-40 flex-shrink-0">Network Status</span>
              <span className="text-gray-600 mr-3">:</span>
              <span className="font-medium text-gray-900 flex-1">{provider.networkStatus}</span>
            </div>
            </div>
          </div>

          {/* Right Column - Benefits Grid */}
          <div className="col-span-9 space-y-3 pl-6">
            <h2 className="text-base font-semibold text-gray-900">Coverage & Eligibility Summary</h2>
            <div className="space-y-4">
            {/* Plan Summary */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Plan Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Payer Name</div>
                  <div className="text-[11px] font-medium">{payer.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Plan Name</div>
                  <div className="text-[11px] font-medium">{payer.planName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Plan Type</div>
                  <div className="text-[11px] font-medium">{payer.planType}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Plan Status</div>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${payer.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    <span className="text-[11px] font-medium">{payer.status}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Effective Date</div>
                  <div className="text-[11px] font-medium">
                    {new Date(payer.effectiveDate).toLocaleDateString('en-US')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Plan End Date</div>
                  <div className="text-[11px] font-medium">
                    {new Date(payer.endDate).toLocaleDateString('en-US')}
                  </div>
                </div>
              </div>
            </div>


            {/* Service Benefits & Coverage */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Service Benefits & Coverage</h3>

              {/* Service Type */}
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Service Type Name</div>
                    <div className="text-[11px] font-medium text-gray-900">
                      {order.imagingModality === 'Surgery' ? 'Surgery' : 'Diagnostic Imaging'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Service Type Code</div>
                    <div className="text-[11px] font-medium text-gray-900">
                      {order.imagingModality === 'Surgery' ? '11' : '62'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductible and Out-of-Pocket Max */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Deductible */}
                <div className="border rounded-lg p-3">
                  <div className="mb-3">
                    <span className="font-medium text-xs">Deductible</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="font-semibold text-[11px]">
                        ${eligibility.financials.deductible.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Used</div>
                      <div className="font-semibold text-[11px]">
                        ${eligibility.financials.deductible.used}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Remaining</div>
                      <div className="font-semibold text-[11px]">
                        ${deductibleRemaining}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Out-of-Pocket Max */}
                <div className="border rounded-lg p-3">
                  <div className="mb-3">
                    <span className="font-medium text-xs">Out-of-Pocket Max</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="font-semibold text-[11px]">
                        ${eligibility.financials.outOfPocket.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Used</div>
                      <div className="font-semibold text-[11px]">
                        ${eligibility.financials.outOfPocket.used}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Remaining</div>
                      <div className="font-semibold text-[11px]">
                        ${outOfPocketRemaining}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copay and Coinsurance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="mb-2">
                    <span className="font-medium text-xs">Copay</span>
                  </div>
                  <div className="font-semibold text-[11px]">${eligibility.financials.copay}</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="mb-2">
                    <span className="font-medium text-xs">Coinsurance</span>
                  </div>
                  <div className="font-semibold text-[11px]">{eligibility.financials.coinsurance}</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-4 flex justify-end gap-3 z-20">
        <button
          onClick={handleGoBack}
          className="px-6 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Go Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
