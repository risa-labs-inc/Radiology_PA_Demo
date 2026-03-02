import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getOrderByMRN } from '../../../utils/patientDataHelpers'
import { useState, useEffect, useRef } from 'react'
import PAForm, { PAFormData } from '../../common/PAForm'
import PALoadingScreen from '../../common/PALoadingScreen'
import PAPreview from '../../common/PAPreview'
import PASuccessModal from '../../common/PASuccessModal'

type StepStatus = 'Completed' | 'In Progress' | 'Blocked' | 'Skipped' | 'Pending' | 'Not Required' | 'Failed' | 'Active'

interface WorkflowStep {
  id: string
  name: string
  status: StepStatus
  description: string
  details: string[]
  linkToIssues?: boolean
}

type PAFilingStep = 'idle' | 'loading' | 'form' | 'preview' | 'success'

export default function Workflow() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const originalOrderData = getOrderByMRN(id!)
  const [orderData, setOrderData] = useState(originalOrderData)

  // For RAD-005 and above, auto-expand all steps
  const orderNumber = originalOrderData ? parseInt(originalOrderData.orderId.split('-')[1]) : 0
  const shouldAutoExpandAll = orderNumber > 4

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})
  const [paFilingStep, setPAFilingStep] = useState<PAFilingStep>('idle')
  const [formData, setFormData] = useState<PAFormData | null>(null)
  const [authorizationNumber, setAuthorizationNumber] = useState<string>('')
  const [showAdditionalSteps, setShowAdditionalSteps] = useState(false)
  const authSubmissionRef = useRef<HTMLDivElement>(null)

  // Check if there's a saved submission on mount
  useEffect(() => {
    if (!originalOrderData) return

    const savedSubmission = localStorage.getItem(`pa-submission-${originalOrderData.orderId}`)
    if (savedSubmission) {
      const submissionData = JSON.parse(savedSubmission)
      // Update order data with paFiled flag but keep auth status as Auth Required
      setOrderData({
        ...originalOrderData,
        paStatus: {
          ...originalOrderData.paStatus,
          authStatus: 'Auth Required',
          AutomationWorkflow: 'In Progress',
          paFiled: true
        },
        documents: submissionData.formData.attachments || originalOrderData.documents
      })
    } else if (originalOrderData.paStatus.paFiled) {
      // If PA was filed internally, treat it as submitted
      setOrderData(originalOrderData)
    }
  }, [originalOrderData])

  if (!orderData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No order data found</p>
      </div>
    )
  }

  const { order, payer, eligibilityVerification, paStatus, documents } = orderData

  // Check if case is marked as complete
  const isMarkedComplete = localStorage.getItem(`case-complete-${orderData.orderId}`) === 'true'

  // Check if PA has been filed (either via paFiled flag or localStorage submission)
  const isPAFiled = paStatus.paFiled || localStorage.getItem(`pa-submission-${orderData.orderId}`) !== null

  const handleMarkComplete = () => {
    localStorage.setItem(`case-complete-${orderData.orderId}`, 'true')
    navigate('/')
  }

  const handleResetPASubmission = () => {
    if (confirm('Are you sure you want to reset the PA submission for this patient? This will clear all saved submission data.')) {
      localStorage.removeItem(`pa-submission-${orderData.orderId}`)
      localStorage.removeItem(`auth-number-${orderData.orderId}`)
      localStorage.removeItem(`case-complete-${orderData.orderId}`)
      // Reset to original order data
      setOrderData(originalOrderData!)
      setPAFilingStep('idle')
      setFormData(null)
      setAuthorizationNumber('')
    }
  }

  // Auto-scroll and expand the Authorization Submission step for PA Ordered/Auth Required status (only if not filed yet)
  useEffect(() => {
    if ((paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !isPAFiled && authSubmissionRef.current) {
      // Expand the submission step
      setExpandedSteps(prev => ({
        ...prev,
        'auth-submission': true
      }))

      // Scroll to the submission step with a slight delay to ensure rendering is complete
      setTimeout(() => {
        authSubmissionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })

        // REMOVED: Auto-start PA filing - let user click the button manually
        // setTimeout(() => {
        //   handleFilePAClick()
        // }, 500)
      }, 100)
    }
  }, [paStatus.authStatus, isPAFiled])

  // Auto-start filing process when navigating from Authorization page or reopening from guidelines
  useEffect(() => {
    const state = location.state as {
      autoStartFiling?: boolean
      reopenPAForm?: boolean
      continueFromGuidelines?: boolean
      formData?: PAFormData
    }

    // Handle continuing from guidelines page (show preview)
    if (state?.continueFromGuidelines && state.formData) {
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })

      // Set form data and show preview
      setFormData(state.formData)
      setPAFilingStep('preview')
      return
    }

    // Handle reopening PA form when returning from guidelines page
    if (state?.reopenPAForm && paFilingStep === 'idle') {
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })

      // Reopen the form with saved data
      if (state.formData) {
        setFormData(state.formData)
      }
      setPAFilingStep('form')
      return
    }

    // Handle auto-start filing from Authorization page
    if (state?.autoStartFiling && !isPAFiled && paFilingStep === 'idle') {
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })

      // Auto-start filing with a slight delay for smooth UX
      setTimeout(() => {
        handleFilePAClick()
      }, 500)
    }
  }, [location, isPAFiled, paFilingStep, navigate])

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }))
  }

  const handleFilePAClick = () => {
    setPAFilingStep('loading')
  }

  const handleLoadingComplete = () => {
    setPAFilingStep('form')
  }

  const handleFormContinue = (data: PAFormData) => {
    setFormData(data)
    setPAFilingStep('preview')
  }

  const handlePreviewClose = () => {
    setPAFilingStep('form')
  }

  const handlePreviewSubmit = () => {
    // Check if authorization number already exists, otherwise generate a new one
    let authNumber = localStorage.getItem(`auth-number-${orderData!.orderId}`)
    if (!authNumber) {
      // Generate a random authorization number
      authNumber = `AUTH-${Date.now()}`
      localStorage.setItem(`auth-number-${orderData!.orderId}`, authNumber)
    }

    // Set the authorization number in state
    setAuthorizationNumber(authNumber)

    // Save to local storage
    const submissionData = {
      orderId: orderData!.orderId,
      submittedAt: new Date().toISOString(),
      formData,
      authorizationNumber: authNumber
    }
    localStorage.setItem(`pa-submission-${orderData!.orderId}`, JSON.stringify(submissionData))

    // Update order data with paFiled flag but keep auth status as Auth Required
    setOrderData({
      ...orderData!,
      paStatus: {
        ...orderData!.paStatus,
        authStatus: 'Auth Required',
        AutomationWorkflow: 'In Progress',
        paFiled: true
      },
      documents: formData!.attachments
    })

    setPAFilingStep('success')
  }

  const handleSuccessClose = () => {
    setPAFilingStep('idle')
    // Navigate to Filed PA tab after successful submission
    navigate(`/patient/${id}/dynamics/filed-pa`)
  }

  const handleFormClose = () => {
    setPAFilingStep('idle')
  }

  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = []

    // Step 1: Order Intake & Context Establishment
    steps.push({
      id: 'order-intake',
      name: 'Order Intake & Context Establishment',
      status: 'Completed',
      description: 'Radiology order received and validated',
      details: [
        `Imaging type identified: ${order.imagingType}`,
        `CPT code(s) extracted: ${order.cptCodes.join(', ')}`,
        `Date of service captured: ${new Date(order.dateOfService).toLocaleDateString('en-US')}`,
        `Ordering provider identified: ${order.orderingProvider.name}`
      ]
    })

    // Step 2: Eligibility Verification
    const eligibilityFailed = paStatus.authStatus === 'Eligibility Failed'
    steps.push({
      id: 'eligibility-verification',
      name: 'Eligibility Verification',
      status: eligibilityFailed ? 'Failed' : 'Completed',
      description: eligibilityFailed
        ? 'Patient eligibility verification failed'
        : 'Patient eligibility verified for the requested service',
      details: eligibilityFailed
        ? [
            'Eligibility could not be verified with the payer',
            'Downstream authorization steps were not executed'
          ]
        : [
            `Plan active for date of service: ${payer.status}`,
            `Member matched successfully: ${orderData.patient.memberId}`,
            `Provider network status confirmed: ${order.orderingProvider.networkStatus}`,
            `Service coverage verified: ${eligibilityVerification.covered ? 'Covered' : 'Not Covered'}`
          ]
    })

    // Step 3: Payer Policy Evaluation
    steps.push({
      id: 'payer-policy',
      name: 'Payer Policy Evaluation',
      status: eligibilityFailed ? 'Skipped' : 'Completed',
      description: eligibilityFailed
        ? 'Payer policy evaluation skipped due to eligibility failure'
        : 'Payer policy evaluated for requested CPT code(s)',
      details: eligibilityFailed
        ? ['Step skipped because eligibility verification failed']
        : [
            `Prior authorization requirement determined: ${eligibilityVerification.priorAuthRequired ? 'Required' : 'Not Required'}`,
            `Service coverage confirmed: ${eligibilityVerification.covered ? 'Yes' : 'No'}`,
            `Referral requirement checked: ${eligibilityVerification.referralRequired ? 'Required' : 'Not Required'}`
          ]
    })

    // Step 4: Authorization Check
    const hasAuthOnFile = paStatus.authStatus === 'Auth on File'
    const isNARForAuthCheck = paStatus.authStatus === 'NAR'
    steps.push({
      id: 'auth-check',
      name: 'Authorization Check',
      status: eligibilityFailed
        ? 'Skipped'
        : isNARForAuthCheck
        ? 'Not Required'
        : 'Completed',
      description: eligibilityFailed
        ? 'Authorization check skipped due to eligibility failure'
        : isNARForAuthCheck
        ? 'Authorization check not applicable for NAR cases'
        : 'Checked for existing authorization with payer',
      details: eligibilityFailed
        ? ['Step skipped because eligibility verification failed']
        : isNARForAuthCheck
        ? ['Step not required because prior authorization not required']
        : hasAuthOnFile
        ? [
            'Authorization verified with payer',
            'Valid authorization found on file',
            'No additional authorization submission required'
          ]
        : [
            'No existing authorization found for this service',
            'Proceeding with authorization validation'
          ]
    })

    // Step 5: Clinical Readiness Validation
    const clinicalBlocked = paStatus.authStatus === 'Query'
    const missingDocs = documents?.filter(doc => doc.status === 'Not Available') || []

    steps.push({
      id: 'clinical-validation',
      name: 'Clinical Readiness Validation',
      status: eligibilityFailed
        ? 'Skipped'
        : hasAuthOnFile || paStatus.authStatus === 'NAR'
        ? 'Not Required'
        : clinicalBlocked
        ? 'Blocked'
        : 'Completed',
      description: eligibilityFailed
        ? 'Clinical validation skipped'
        : hasAuthOnFile || paStatus.authStatus === 'NAR'
        ? 'Clinical validation not required'
        : clinicalBlocked
        ? 'Clinical documentation validation blocked'
        : 'Clinical documentation validated for authorization submission',
      details: eligibilityFailed
        ? ['Step skipped because eligibility verification failed']
        : hasAuthOnFile
        ? ['Step not required because valid authorization already on file']
        : paStatus.authStatus === 'NAR'
        ? ['Step not required because prior authorization not required']
        : clinicalBlocked
        ? [
            `Issue detected: ${paStatus.issueType || paStatus.authStatus}`,
            missingDocs.length > 0 ? `Missing documents: ${missingDocs.map(d => d.name).join(', ')}` : 'Documentation gap identified',
            'See Issues tab for detailed resolution steps'
          ]
        : [
            'Clinical notes availability verified',
            'Supporting imaging documentation validated',
            'Diagnosis code alignment confirmed',
            'All required documentation present'
          ],
      linkToIssues: clinicalBlocked
    })

    // Step 6: Authorization Submission Preparation
    const isNAR = paStatus.authStatus === 'NAR'
    const needsPreparation = eligibilityVerification.priorAuthRequired && !hasAuthOnFile && !clinicalBlocked && !eligibilityFailed
    const paOrdered = (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !paStatus.paFiled

    steps.push({
      id: 'submission-prep',
      name: 'Authorization Submission Preparation',
      status: eligibilityFailed
        ? 'Skipped'
        : isNAR || hasAuthOnFile
        ? 'Not Required'
        : clinicalBlocked
        ? 'Blocked'
        : paStatus.authStatus === 'PA Submitted' || paStatus.paFiled || paStatus.AutomationWorkflow === 'In Progress' || paOrdered
        ? 'Completed'
        : needsPreparation
        ? 'In Progress'
        : 'Not Required',
      description: eligibilityFailed
        ? 'Submission preparation skipped due to eligibility failure'
        : isNAR
        ? 'Authorization submission not required'
        : hasAuthOnFile
        ? 'Submission preparation not required - authorization already on file'
        : clinicalBlocked
        ? 'Submission preparation blocked pending clinical validation'
        : 'Authorization request prepared for submission',
      details: eligibilityFailed
        ? ['Step skipped because eligibility verification failed']
        : isNAR
        ? ['Payer policy indicates no authorization required for this service']
        : hasAuthOnFile
        ? ['Valid authorization already exists with payer']
        : clinicalBlocked
        ? ['Submission cannot be prepared until clinical documentation is complete']
        : paStatus.authStatus === 'PA Submitted' || paStatus.paFiled || paStatus.AutomationWorkflow === 'In Progress' || paOrdered
        ? [
            'Required clinical documentation compiled',
            'Supporting imaging reports assembled',
            'Authorization request payload prepared',
            'Payer-specific submission requirements applied'
          ]
        : needsPreparation
        ? [
            'Gathering required clinical documentation',
            'Compiling supporting imaging reports',
            'Preparing payer-specific submission requirements'
          ]
        : ['Submission preparation not applicable for this case']
    })

    // Step 7: Authorization Submission
    const paSubmitted = paStatus.authStatus === 'PA Submitted' || paStatus.paFiled

    steps.push({
      id: 'auth-submission',
      name: 'Authorization Submission',
      status: eligibilityFailed
        ? 'Skipped'
        : isNAR || hasAuthOnFile
        ? 'Not Required'
        : clinicalBlocked
        ? 'Blocked'
        : paSubmitted
        ? 'In Progress'
        : paOrdered
        ? 'Pending'
        : paStatus.AutomationWorkflow === 'Completed'
        ? 'Not Required'
        : 'Pending',
      description: eligibilityFailed
        ? 'Authorization submission skipped due to eligibility failure'
        : isNAR || hasAuthOnFile
        ? 'Authorization submission not required'
        : clinicalBlocked
        ? 'Authorization submission blocked pending documentation'
        : paSubmitted
        ? 'Authorization submitted to payer'
        : paOrdered
        ? 'Ready to submit authorization to payer'
        : paStatus.AutomationWorkflow === 'Completed'
        ? 'Authorization submission not required for this case'
        : 'Authorization submission pending',
      details: eligibilityFailed
        ? ['Step skipped because eligibility verification failed']
        : isNAR
        ? ['No authorization required per payer policy']
        : hasAuthOnFile
        ? ['Valid authorization already exists - no submission needed']
        : clinicalBlocked
        ? ['Submission blocked until clinical documentation requirements are met']
        : paSubmitted
        ? [
            'Authorization request transmitted to payer',
            'Submission method applied per payer requirements',
            'Awaiting payer determination'
          ]
        : paOrdered
        ? [
            'All required documentation has been gathered',
            'Authorization request is ready for submission',
            'System will automatically submit to payer portal',
            'Submission can be initiated immediately'
          ]
        : paStatus.AutomationWorkflow === 'Completed'
        ? ['Authorization not required for this service']
        : ['Authorization submission will proceed once preparation is complete']
    })

    // Step 8: Post-Submission Monitoring
    steps.push({
      id: 'monitoring',
      name: 'Post-Submission Monitoring',
      status: paSubmitted
        ? 'Active'
        : isNAR || hasAuthOnFile || paStatus.AutomationWorkflow === 'Completed'
        ? 'Not Required'
        : eligibilityFailed || clinicalBlocked
        ? 'Blocked'
        : 'Pending',
      description: paSubmitted
        ? 'Monitoring authorization status for payer response'
        : isNAR || hasAuthOnFile || paStatus.AutomationWorkflow === 'Completed'
        ? 'Monitoring not required'
        : eligibilityFailed || clinicalBlocked
        ? 'Monitoring blocked pending authorization submission'
        : 'Monitoring will begin after submission',
      details: paSubmitted
        ? [
            'Awaiting payer determination',
            'System will automatically check for updates',
            'Next action will be triggered based on payer response'
          ]
        : isNAR
        ? ['No authorization required - monitoring not applicable']
        : hasAuthOnFile
        ? ['Authorization already verified - monitoring not required']
        : paStatus.AutomationWorkflow === 'Completed'
        ? ['Workflow completed - no monitoring required']
        : eligibilityFailed || clinicalBlocked
        ? ['Monitoring cannot begin until authorization is submitted']
        : ['Monitoring will begin once authorization is submitted']
    })

    return steps
  }

  const allSteps = getWorkflowSteps()
  // For all patients, show all steps
  // RAD-001 to RAD-004: Show first 4, hide rest behind button
  // RAD-005+: Show all steps
  const steps = allSteps

  // Auto-expand all steps for RAD-005 and above on mount
  useEffect(() => {
    if (shouldAutoExpandAll) {
      const allExpanded: Record<string, boolean> = {}
      steps.forEach(step => {
        allExpanded[step.id] = true
      })
      setExpandedSteps(allExpanded)
    }
  }, [shouldAutoExpandAll, steps.length])

  const getStatusColor = (_status: StepStatus) => {
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        )
      case 'In Progress':
      case 'Active':
        // Show static clock icon
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'Blocked':
      case 'Failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        )
      case 'Pending':
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'Skipped':
      case 'Not Required':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authorization Workflow</h2>
          <p className="text-sm text-gray-600">
            Step-by-step view of the automated prior authorization process for this order
          </p>
        </div>


        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {/* Show first 4 steps for RAD-001 to RAD-004, all steps for RAD-005+ */}
            {(orderNumber <= 4 ? steps.slice(0, 4) : steps).map((step, index) => (
              <div
                key={step.id}
                className="relative"
                ref={step.id === 'auth-submission' ? authSubmissionRef : null}
              >
                {/* Step marker */}
                <div className={`absolute left-0 flex items-center justify-center w-12 h-12 bg-white rounded-full ${
                  step.status === 'Blocked' || step.status === 'Failed'
                    ? 'border-2 border-red-600'
                    : 'border-2 border-gray-200'
                }`}>
                  {getStatusIcon(step.status)}
                </div>

                {/* Step content */}
                <div className="ml-16">
                  <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                    step.id === 'auth-submission' && (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !isPAFiled
                      ? 'border-2 border-gray-400 ring-2 ring-gray-100'
                      : 'border border-gray-200'
                  }`}>
                    <div className="p-5">
                      {step.id === 'auth-submission' && (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !isPAFiled && (
                        <div className="mb-3 bg-white border-l-4 border-gray-400 p-5 rounded-r-lg">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h2 className="text-base font-semibold text-gray-900">Prior Authorization Ready for Submission</h2>
                                <span className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                                  Action Required
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">Impact:</span> Authorization request is prepared and ready to be submitted to payer
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {index + 1}. {step.name}
                            </h3>
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${getStatusColor(step.status)}`}>
                              {step.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="ml-4 p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                              expandedSteps[step.id] ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {expandedSteps[step.id] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Details</h4>
                          <ul className="space-y-2">
                            {step.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-gray-400 flex-shrink-0">•</span>
                                <span className="flex-1">{detail}</span>
                              </li>
                            ))}
                          </ul>
                          {step.linkToIssues && (
                            <div className="mt-4">
                              <button
                                onClick={() => navigate(`/patient/${id}/dynamics/issues`)}
                                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:underline font-medium"
                              >
                                View detailed resolution steps in Issues tab
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          )}
                          {step.id === 'auth-submission' && (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !isPAFiled && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <button
                                onClick={handleFilePAClick}
                                className="w-full px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                File Prior Authorization
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Button to show/hide additional steps - only for RAD-001 to RAD-004 */}
            {orderNumber <= 4 && steps.length > 4 && (
              <div className="relative">
                <div className="ml-16">
                  <button
                    onClick={() => setShowAdditionalSteps(!showAdditionalSteps)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-700"
                  >
                    {showAdditionalSteps ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Hide Additional Steps ({steps.length - 4})
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Show Additional Steps ({steps.length - 4})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Show remaining steps when button is clicked - only for RAD-001 to RAD-004 */}
            {orderNumber <= 4 && showAdditionalSteps && steps.slice(4).map((step, index) => (
              <div
                key={step.id}
                className="relative"
                ref={step.id === 'auth-submission' ? authSubmissionRef : null}
              >
                {/* Step marker */}
                <div className={`absolute left-0 flex items-center justify-center w-12 h-12 bg-white rounded-full ${
                  step.status === 'Blocked' || step.status === 'Failed'
                    ? 'border-2 border-red-600'
                    : 'border-2 border-gray-200'
                }`}>
                  {getStatusIcon(step.status)}
                </div>

                {/* Step content */}
                <div className="ml-16">
                  <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                    step.id === 'auth-submission' && (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !isPAFiled
                      ? 'border-2 border-gray-400 ring-2 ring-gray-100'
                      : 'border border-gray-200'
                  }`}>
                    <div className="p-5">
                      {step.id === 'auth-submission' && (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && !isPAFiled && (
                        <div className="mb-3 bg-white border-l-4 border-gray-400 p-5 rounded-r-lg">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h2 className="text-base font-semibold text-gray-900">Prior Authorization Ready for Submission</h2>
                                <span className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                                  Action Required
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">Impact:</span> Authorization request is prepared and ready to be submitted to payer
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {index + 5}. {step.name}
                            </h3>
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${getStatusColor(step.status)}`}>
                              {step.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="ml-4 p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                              expandedSteps[step.id] ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {expandedSteps[step.id] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Details</h4>
                          <ul className="space-y-2">
                            {step.details.map((detail, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-gray-600 mt-1">•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                          {step.linkToIssues && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <button
                                onClick={() => navigate(`/patient/${id}/dynamics/issues`)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                View Issues & Resolution Steps
                              </button>
                            </div>
                          )}
                          {step.id === 'auth-submission' && (paStatus.authStatus === 'PA Ordered' || paStatus.authStatus === 'Auth Required') && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <button
                                onClick={handleFilePAClick}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                File Prior Authorization
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* PA Filing Workflow Modals */}
      <PALoadingScreen
        isOpen={paFilingStep === 'loading'}
        onComplete={handleLoadingComplete}
      />

      <PAForm
        isOpen={paFilingStep === 'form'}
        onClose={handleFormClose}
        onContinue={handleFormContinue}
        orderData={orderData}
      />

      <PAPreview
        isOpen={paFilingStep === 'preview'}
        onClose={handlePreviewClose}
        onSubmit={handlePreviewSubmit}
        orderData={orderData}
        formData={formData!}
      />

      <PASuccessModal
        isOpen={paFilingStep === 'success'}
        onClose={handleSuccessClose}
        authorizationNumber={authorizationNumber}
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-4 flex justify-between gap-3 z-20">
        <div className="flex gap-3">
          {/* Debug button to reset PA submission - useful for testing */}
          {(paStatus.authStatus === 'PA Submitted' || localStorage.getItem(`pa-submission-${orderData.orderId}`)) && (
            <button
              onClick={handleResetPASubmission}
              className="px-6 py-2 text-sm border border-orange-300 text-orange-700 rounded hover:bg-orange-50 flex items-center gap-2"
              title="Reset PA submission (for testing/debugging)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset PA Submission
            </button>
          )}
        </div>
        <div className="flex gap-3">
        <button
          onClick={() => navigate(`/patient/${id}/ev`)}
          className="px-6 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Go Back
        </button>
        {/* Show action button based on status - hide if marked complete */}
        {!isMarkedComplete && (
          <>
            {(paStatus.authStatus === 'Query' || paStatus.authStatus === 'Eligibility Failed') && (
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
            {['Auth Required', 'PA Ordered'].includes(paStatus.authStatus) && !isPAFiled && (
              <button
                onClick={handleFilePAClick}
                className="px-6 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                File Prior Authorization
              </button>
            )}
            {(paStatus.authStatus === 'PA Submitted' || isPAFiled) && (
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
      </div>
    </div>
  )
}
