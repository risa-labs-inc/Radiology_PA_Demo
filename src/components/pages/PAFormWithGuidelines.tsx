import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Document, getOrderByMRN } from '../../utils/patientDataHelpers'
import { getIcdDescription } from '../../utils/icdCodes'
import { PAFormData } from '../common/PAForm'

interface DiagnosisEntry {
  icdCode: string
  icdDescription: string
}

interface ProcedureEntry {
  codeDescription: string
  code: string
  serviceQuantity: string
  serviceQuantityType: string
}

export default function PAFormWithGuidelines() {
  const navigate = useNavigate()
  const { id } = useParams()
  const orderData = getOrderByMRN(id!)

  // Pre-fill diagnoses with data from orderData or dummy data
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>(() => {
    if (!orderData) return [{ icdCode: 'G43.909', icdDescription: getIcdDescription('G43.909') }]
    if (orderData.order.diagnosisCodes && orderData.order.diagnosisCodes.length > 0) {
      return orderData.order.diagnosisCodes.map(code => {
        // Handle both string format and object format
        if (typeof code === 'string') {
          return {
            icdCode: code,
            icdDescription: getIcdDescription(code)
          }
        } else {
          // Handle object format with code and description
          return {
            icdCode: (code as any).code,
            icdDescription: (code as any).description || getIcdDescription((code as any).code)
          }
        }
      })
    }
    return [{ icdCode: 'G43.909', icdDescription: getIcdDescription('G43.909') }]
  })

  // Pre-fill procedures with data from orderData
  const [procedures, setProcedures] = useState<ProcedureEntry[]>(() => {
    if (!orderData) return [{ codeDescription: '', code: '', serviceQuantity: '365', serviceQuantityType: 'Days' }]
    if (orderData.order.cptCodes && orderData.order.cptCodes.length > 0) {
      return orderData.order.cptCodes.map(code => ({
        codeDescription: orderData.order.imagingType,
        code: code,
        serviceQuantity: '1',
        serviceQuantityType: 'Units'
      }))
    }
    return [{ codeDescription: '', code: '', serviceQuantity: '365', serviceQuantityType: 'Days' }]
  })

  const [providerNotes, setProviderNotes] = useState('Patient presents with chronic symptoms requiring advanced imaging for proper diagnosis and treatment planning. Clinical documentation supports medical necessity.')
  const [fromDate, setFromDate] = useState(orderData?.order.dateOfService || new Date().toISOString().split('T')[0])
  const [attachments, setAttachments] = useState<Document[]>(orderData?.documents || [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  if (!orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No order data found</p>
      </div>
    )
  }

  const addDiagnosis = () => {
    setDiagnoses([...diagnoses, { icdCode: '', icdDescription: '' }])
  }

  const removeDiagnosis = (index: number) => {
    if (diagnoses.length > 1) {
      setDiagnoses(diagnoses.filter((_, i) => i !== index))
    }
  }

  const updateDiagnosis = (index: number, field: keyof DiagnosisEntry, value: string) => {
    const updated = [...diagnoses]
    updated[index][field] = value
    setDiagnoses(updated)
  }

  const addProcedure = () => {
    setProcedures([...procedures, { codeDescription: '', code: '', serviceQuantity: '365', serviceQuantityType: 'Days' }])
  }

  const removeProcedure = (index: number) => {
    if (procedures.length > 1) {
      setProcedures(procedures.filter((_, i) => i !== index))
    }
  }

  const updateProcedure = (index: number, field: keyof ProcedureEntry, value: string) => {
    const updated = [...procedures]
    updated[index][field] = value
    setProcedures(updated)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newAttachments: Document[] = Array.from(files).map((file) => ({
      id: `doc-${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type || 'Document',
      fetchedDate: new Date().toISOString(),
      source: 'Manual Upload',
      status: 'Retrieved',
      url: URL.createObjectURL(file)
    }))

    setAttachments([...attachments, ...newAttachments])
    event.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const viewDocument = (doc: Document) => {
    if (doc.url) {
      window.open(doc.url, '_blank')
    }
  }

  const handleContinue = () => {
    const formDataToSave: PAFormData = {
      diagnoses,
      procedures,
      providerNotes,
      fromDate,
      attachments
    }

    // Navigate back to workflow with state to show preview
    navigate(`/patient/${id}/dynamics/workflow`, {
      state: { continueFromGuidelines: true, formData: formDataToSave }
    })
  }

  const handleHideGuidelines = () => {
    // Navigate back to workflow with state to reopen the PA form
    navigate(`/patient/${id}/dynamics/workflow`, {
      state: { reopenPAForm: true, formData: { diagnoses, procedures, providerNotes, fromDate, attachments } }
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {orderData.patient.name.toUpperCase()} ({orderData.patient.mrn})
          </h1>
        </div>
        <button
          onClick={handleHideGuidelines}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Guidelines */}
        <div className="w-1/2 bg-white border-r flex flex-col">
          <div className="bg-gray-50 border-b px-6 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Clinical Guidelines</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              src="/documents/Guideline.pdf#view=FitH&pagemode=none&navpanes=0&toolbar=1"
              className="w-full h-full border-0"
              title="Clinical Guidelines"
            />
          </div>
        </div>

        {/* Right Side - PA Form */}
        <div className="w-1/2 flex overflow-hidden">
          {/* Form Content */}
          <div ref={mainContentRef} className="flex-1 overflow-y-auto pb-24">
            <div className="px-8 py-6">
              {/* Aetna Header */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-4 mb-6">
                <h2 className="text-lg font-bold text-gray-900">Aetna Patient Information Form</h2>
              </div>

              {/* Patient Details Section */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Patient Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Member ID
                      </label>
                      <input
                        type="text"
                        defaultValue={orderData.patient.memberId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship to Subscriber
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option>Self</option>
                        <option>Spouse</option>
                        <option>Child</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        defaultValue={orderData.patient.name.split(' ')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        defaultValue={orderData.patient.name.split(' ').slice(1).join(' ')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        defaultValue={orderData.patient.dob}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Details Section */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Provider Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider First Name
                      </label>
                      <input
                        type="text"
                        defaultValue={orderData.order.orderingProvider.name.split(' ')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider Last Name
                      </label>
                      <input
                        type="text"
                        defaultValue={orderData.order.orderingProvider.name.split(' ').slice(1).join(' ')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NPI Number
                    </label>
                    <input
                      type="text"
                      defaultValue={orderData.order.orderingProvider.npi}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Place Of Service
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option>11 - Office</option>
                      <option>21 - Inpatient Hospital</option>
                      <option>22 - Outpatient Hospital</option>
                      <option>23 - Emergency Room</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facility NPI
                    </label>
                    <input
                      type="text"
                      placeholder="1326046467"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Diagnosis Information Section */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Diagnosis Information
                </h3>
                <div className="space-y-4">
                  {diagnoses.map((diagnosis, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Diagnosis</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ICD Code <span className="text-red-600">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={diagnosis.icdCode}
                              onChange={(e) => updateDiagnosis(index, 'icdCode', e.target.value)}
                              placeholder="Enter text to search..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                            <svg
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ICD Description
                          </label>
                          <input
                            type="text"
                            value={diagnosis.icdDescription}
                            onChange={(e) => updateDiagnosis(index, 'icdDescription', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                            readOnly
                          />
                        </div>
                      </div>
                      {diagnoses.length > 1 && (
                        <button
                          onClick={() => removeDiagnosis(index)}
                          className="absolute top-4 right-4 p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addDiagnosis}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add more
                  </button>
                </div>
              </div>

              {/* Procedures Information Section */}
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Procedures Information
                </h3>
                <div className="space-y-4">
                  {procedures.map((procedure, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Procedure</div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Procedure Code Description <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={procedure.codeDescription}
                              onChange={(e) => updateProcedure(index, 'codeDescription', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Procedure Code (CPT / HCPCS) <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={procedure.code}
                              onChange={(e) => updateProcedure(index, 'code', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Procedure Service Quantity
                            </label>
                            <input
                              type="text"
                              value={procedure.serviceQuantity}
                              onChange={(e) => updateProcedure(index, 'serviceQuantity', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Procedure Service Quantity Type
                            </label>
                            <select
                              value={procedure.serviceQuantityType}
                              onChange={(e) => updateProcedure(index, 'serviceQuantityType', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            >
                              <option>Days</option>
                              <option>Visits</option>
                              <option>Units</option>
                              <option>Hours</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      {procedures.length > 1 && (
                        <button
                          onClick={() => removeProcedure(index)}
                          className="absolute top-4 right-4 p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addProcedure}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add more
                  </button>
                </div>

                {/* Provider Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider Notes
                  </label>
                  <textarea
                    value={providerNotes}
                    onChange={(e) => setProviderNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* From Date */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="mb-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200 flex items-center justify-between">
                  Attachments
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Attachment
                  </button>
                </h3>
                <div className="space-y-3">
                  {attachments.map((doc, index) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 group relative">
                      <div className="flex items-center gap-3 flex-1">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                          <div className="text-xs text-gray-500">{doc.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.url && (
                          <button
                            onClick={() => viewDocument(doc)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        )}
                        <button
                          onClick={() => removeAttachment(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 mb-2">No attachments added</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                      >
                        Add your first attachment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="bg-white border-t px-8 py-4 flex justify-end gap-3">
        <button
          onClick={handleHideGuidelines}
          className="px-6 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          Hide Guidelines
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
