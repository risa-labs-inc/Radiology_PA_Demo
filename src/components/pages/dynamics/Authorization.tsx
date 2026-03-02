import { useNavigate, useParams } from 'react-router-dom'
import { getOrderByMRN } from '../../../utils/patientDataHelpers'
import { useState } from 'react'
import DocumentModal from '../../common/DocumentModal'

export default function Authorization() {
  const navigate = useNavigate()
  const { id } = useParams()
  const orderData = getOrderByMRN(id!)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [currentDocument, setCurrentDocument] = useState({ title: '', url: '' })

  if (!orderData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No order data found</p>
      </div>
    )
  }

  const { payer, paStatus, order } = orderData

  // Check if case is marked as complete
  const isMarkedComplete = localStorage.getItem(`case-complete-${orderData.orderId}`) === 'true'

  const handleMarkComplete = () => {
    localStorage.setItem(`case-complete-${orderData.orderId}`, 'true')
    navigate('/')
  }

  const getAuthStatusBadge = (status: string) => {
    const imagingService = `${order.imagingType} (CPT ${order.cptCodes.join(', ')})`

    switch (status) {
      case 'NAR':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">No Authorization Required</div>
              <div className="text-sm text-gray-600 mt-1">No prior authorization required for {imagingService}</div>
            </div>
          </div>
        )
      case 'Auth on File':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Authorization on File</div>
              <div className="text-sm text-gray-600 mt-1">Valid authorization exists for {imagingService}</div>
            </div>
          </div>
        )
      case 'Auth Required':
        // If PA has been filed internally, show PA Submitted badge instead
        if (paStatus.paFiled) {
          return (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">PA Submitted</div>
                <div className="text-sm text-gray-600 mt-1">Authorization request for {imagingService} submitted to payer</div>
              </div>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Auth Required - PA to be Filed</div>
              <div className="text-sm text-gray-600 mt-1">Prior authorization required for {imagingService} and needs to be filed</div>
            </div>
          </div>
        )
      case 'PA Ordered':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">PA Ordered - Not Yet Filed</div>
              <div className="text-sm text-gray-600 mt-1">Prior authorization for {imagingService} ordered but not yet submitted</div>
            </div>
          </div>
        )
      case 'PA Submitted':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">PA Submitted</div>
              <div className="text-sm text-gray-600 mt-1">Authorization request for {imagingService} submitted to payer</div>
            </div>
          </div>
        )
      case 'Clinical Missing':
      case 'Supporting Imaging Missing':
      case 'Invalid Dx Code':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Authorization Required</div>
              <div className="text-sm text-gray-600 mt-1">Prior authorization needed - documentation pending</div>
            </div>
          </div>
        )
      case 'Query':
        const issueText = paStatus.issueType || 'Additional information required'
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Query</div>
              <div className="text-sm text-gray-600 mt-1">{issueText}</div>
            </div>
          </div>
        )
      case 'Eligibility Failed':
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Blocked</div>
              <div className="text-sm text-gray-600 mt-1">Authorization process blocked due to eligibility issue</div>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{status}</div>
              <div className="text-sm text-gray-600 mt-1">Authorization status</div>
            </div>
          </div>
        )
    }
  }

  const getSubmissionStatus = () => {
    if (paStatus.authStatus === 'NAR') {
      return 'Not Required'
    }
    if (paStatus.authStatus === 'Auth on File') {
      return 'Approved'
    }
    if (paStatus.authStatus === 'PA Submitted' || paStatus.paFiled) {
      return 'Pending Payer Review'
    }
    if (paStatus.authStatus === 'Auth Required' || paStatus.authStatus === 'PA Ordered') {
      return 'Not Yet Submitted'
    }
    if (paStatus.authStatus === 'Eligibility Failed') {
      return 'Not Required'
    }
    if (['Query', 'Clinical Missing', 'Supporting Imaging Missing', 'Invalid Dx Code'].includes(paStatus.authStatus)) {
      return 'Pending Submission'
    }
    return 'Pending'
  }

  const getSubmissionStatusBadge = (status: string) => {
    switch (status) {
      case 'Not Required':
        return (
          <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-[10px] font-medium rounded">
            Not Required
          </span>
        )
      case 'Approved':
        return (
          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-medium rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-700 rounded-full"></span>
            Approved
          </span>
        )
      case 'Pending Payer Review':
        return (
          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-medium rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-700 rounded-full"></span>
            Pending Payer Review
          </span>
        )
      case 'Not Yet Submitted':
        return (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-purple-700 rounded-full"></span>
            Not Yet Submitted
          </span>
        )
      case 'Pending Submission':
        return (
          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-medium rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-700 rounded-full"></span>
            Pending Submission
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-[10px] font-medium rounded">
            {status}
          </span>
        )
    }
  }

  const getPayerResponse = () => {
    const imagingService = `${order.imagingType} (CPT ${order.cptCodes.join(', ')})`

    if (paStatus.authStatus === 'NAR') {
      return `Per ${payer.name} policy, ${imagingService} does not require prior authorization`
    }
    if (paStatus.authStatus === 'Auth on File') {
      return `Authorization approved by ${payer.name} for ${imagingService}`
    }
    if (paStatus.authStatus === 'PA Submitted' || paStatus.paFiled) {
      return `Pending ${payer.name} review for ${imagingService}`
    }
    if (paStatus.authStatus === 'Auth Required' && !paStatus.paFiled) {
      return `Prior authorization required by ${payer.name} for ${imagingService} and needs to be filed`
    }
    if (paStatus.authStatus === 'PA Ordered') {
      return `Authorization for ${imagingService} has been ordered and is ready to be submitted to ${payer.name}`
    }
    if (paStatus.authStatus === 'Eligibility Failed') {
      return `Authorization for ${imagingService} cannot be processed due to eligibility failure`
    }
    if (paStatus.authStatus === 'Query') {
      const issueType = paStatus.issueType
      if (issueType === 'Clinical Missing') {
        return `${payer.name} has requested additional clinical documentation for ${imagingService}`
      }
      if (issueType === 'Supporting Imaging Missing') {
        return `${payer.name} has requested supporting imaging documentation for ${imagingService}`
      }
      if (issueType === 'Invalid Dx Code') {
        return `${payer.name} has requested diagnosis code clarification for ${imagingService}`
      }
      return `${payer.name} has requested additional information for ${imagingService}`
    }
    if (paStatus.authStatus === 'Clinical Missing') {
      return `Awaiting clinical documentation before submitting ${imagingService} authorization`
    }
    if (paStatus.authStatus === 'Supporting Imaging Missing') {
      return `Awaiting supporting imaging documentation before submitting ${imagingService} authorization`
    }
    if (paStatus.authStatus === 'Invalid Dx Code') {
      return `Awaiting diagnosis code correction before submitting ${imagingService} authorization`
    }
    return `No response from payer yet for ${imagingService}`
  }

  const getNextAction = () => {
    if (paStatus.authStatus === 'NAR') {
      return 'No further action required'
    }
    if (paStatus.authStatus === 'Auth on File') {
      return 'No further action required'
    }
    if (paStatus.authStatus === 'PA Submitted' || paStatus.paFiled) {
      return 'System is monitoring for payer response'
    }
    if ((paStatus.authStatus === 'Auth Required' && !paStatus.paFiled) || paStatus.authStatus === 'PA Ordered') {
      return 'System is preparing to file authorization request with payer'
    }
    if (paStatus.authStatus === 'Eligibility Failed') {
      return 'System cannot proceed until eligibility is resolved'
    }
    if (paStatus.authStatus === 'Query') {
      const issueType = paStatus.issueType
      if (issueType === 'Clinical Missing') {
        return 'Awaiting clinical documentation'
      }
      if (issueType === 'Supporting Imaging Missing') {
        return 'Awaiting supporting imaging documentation'
      }
      if (issueType === 'Invalid Dx Code') {
        return 'Awaiting diagnosis code correction'
      }
      return 'Awaiting additional documentation'
    }
    if (paStatus.authStatus === 'Clinical Missing') {
      return 'Awaiting clinical documentation before submission'
    }
    if (paStatus.authStatus === 'Supporting Imaging Missing') {
      return 'Awaiting supporting imaging documentation before submission'
    }
    if (paStatus.authStatus === 'Invalid Dx Code') {
      return 'Awaiting diagnosis code correction before submission'
    }
    return 'System is preparing authorization request'
  }

  const showAuthorizationDetails = paStatus.authStatus === 'Auth on File'
  const submissionStatus = getSubmissionStatus()

  const getFiledPAScreenshot = () => {
    // For RAD-008 and RAD-009, show the actual Filed_PA.pdf
    if (orderData && (orderData.orderId === 'RAD-008' || orderData.orderId === 'RAD-009')) {
      return '/documents/Filed_PA.pdf'
    }
    // For surgery patients, show NAR_SUR.pdf
    if (orderData && orderData.orderId.startsWith('SUR-')) {
      return '/documents/NAR_SUR.pdf'
    }
    // Using placeholder image for other patients
    return '/documents/NAR_SS.png'
  }

  const openDocument = (documentPath: string, title: string) => {
    setCurrentDocument({ title, url: documentPath })
    setIsDocumentModalOpen(true)
  }

  return (
    <div className="pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Section 1: SERVICE REQUESTED (Top Priority) */}
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {order.imagingModality === 'Surgery' ? 'Service Requested' : 'Imaging Service Requested'}
            </h2>
            <div className="text-xl font-bold text-gray-900">{order.imagingType}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Billing / Authorization CPT</div>
              <div className="text-sm font-medium text-gray-900">{order.cptCodes.join(', ')}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">
                {order.imagingModality === 'Surgery' ? 'Modality' : 'Imaging Modality'}
              </div>
              <div className="text-sm font-medium text-gray-900">{order.imagingModality}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Authorization Status */}
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Authorization Status</h3>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {getAuthStatusBadge(paStatus.authStatus)}
            </div>
            {paStatus.authStatus === 'NAR' && (
              <button
                onClick={() => openDocument(getFiledPAScreenshot(), 'NAR Verification Documentation')}
                className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                title="View/Download NAR Documentation"
              >
                <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Payer Authorization Details (Conditional) */}
        {showAuthorizationDetails && (
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payer Authorization Details</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Payer Name</div>
                <div className="text-sm font-medium text-gray-900">{payer.name}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Authorization Number</div>
                <div className="text-sm font-medium text-gray-900">AUTH-2026-A7K9M3P5X2</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Authorized CPT</div>
                <div className="text-sm font-medium text-gray-900">{order.cptCodes.join(', ')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Submission & Payer Response */}
        {paStatus.authStatus !== 'NAR' &&
         (paStatus.authStatus !== 'Auth Required' || paStatus.paFiled) &&
         !['Query', 'Clinical Missing', 'Supporting Imaging Missing', 'Invalid Dx Code', 'Eligibility Failed'].includes(paStatus.authStatus) && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Submission & Payer Response</h3>
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">Submission Status</div>
                  <div className="inline-block">{getSubmissionStatusBadge(submissionStatus)}</div>
                </div>
                {paStatus.paFiled && (
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">Filed PA</div>
                    <button
                      onClick={() => openDocument(getFiledPAScreenshot(), 'PA Filed by Agent')}
                      className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View PA Filed by Agent
                    </button>
                  </div>
                )}
                {(paStatus.authStatus === 'PA Submitted' || paStatus.paFiled) && (
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">Authorization Number</div>
                    <div className="text-sm font-mono font-semibold text-gray-900">
                      {localStorage.getItem(`auth-number-${orderData.orderId}`) || `AUTH-${Date.now()}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">Latest Payer Response</div>
              <div className="text-sm text-gray-900">{getPayerResponse()}</div>
            </div>
          </div>
        </div>
        )}

        {/* Section 5: Next Expected System Action */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Next Expected System Action</h3>
          <div className="text-sm text-gray-700">{getNextAction()}</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-4 flex justify-end gap-3 z-20">
        <button
          onClick={() => navigate(`/patient/${id}/ev`)}
          className="px-6 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Go Back
        </button>
        {/* Show action button based on status - hide if marked complete */}
        {!isMarkedComplete && (
          <>
            {(['Query', 'Clinical Missing', 'Supporting Imaging Missing', 'Invalid Dx Code', 'Eligibility Failed'].includes(paStatus.authStatus) || paStatus.AutomationWorkflow === 'Blocked') && (
              <button
                onClick={() => navigate(`/patient/${id}/dynamics/issues`)}
                className="px-6 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                View Issues
              </button>
            )}
            {['Auth Required', 'PA Ordered'].includes(paStatus.authStatus) && !paStatus.paFiled && (
              <button
                onClick={() => navigate(`/patient/${id}/dynamics/workflow`, { state: { autoStartFiling: true } })}
                className="px-6 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                File Prior Authorization
              </button>
            )}
            {(paStatus.authStatus === 'PA Submitted' || paStatus.paFiled) && (
              <button
                onClick={handleMarkComplete}
                className="px-6 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark as Complete
              </button>
            )}
          </>
        )}
      </div>

      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        title={currentDocument.title}
        documentUrl={currentDocument.url}
      />
    </div>
  )
}
