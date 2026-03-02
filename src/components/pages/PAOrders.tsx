import { useNavigate } from 'react-router-dom'
import { getAllOrdersForTable, getAllOrders, getOrderByMRN } from '../../utils/patientDataHelpers'
import { useState } from 'react'

export default function PAOrders() {
  const navigate = useNavigate()
  const orders = getAllOrdersForTable()
  const [showProcessingInfo, setShowProcessingInfo] = useState(false)
  const [selectedOrderMRN, setSelectedOrderMRN] = useState<string | null>(null)
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false)

  const handlePatientClick = (mrn: string) => {
    navigate(`/patient/${mrn}/ev`)
  }

  const handleViewWorkflow = (mrn: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedOrderMRN(mrn)
    setIsWorkflowModalOpen(true)
  }

  const getAuthStatusColor = (status: string) => {
    switch (status) {
      case 'NAR':
        return 'bg-green-100 text-green-700'
      case 'Auth on File':
        return 'bg-blue-100 text-blue-700'
      case 'Auth Required':
      case 'PA Ordered':
        return 'bg-orange-100 text-orange-700'
      case 'Query':
        return 'bg-red-100 text-red-700'
      case 'PA Submitted':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getAutomationStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700'
      case 'In Progress':
        return 'bg-blue-100 text-blue-700'
      case 'Blocked':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Calculate processing statistics
  const calculateProcessingStats = () => {
    const allOrders = getAllOrders()
    const totalOrders = allOrders.length

    const paFiledCount = allOrders.filter(order =>
      order.paStatus.authStatus === 'PA Submitted' ||
      order.paStatus.authStatus === 'Auth on File'
    ).length

    const narCount = allOrders.filter(order =>
      order.paStatus.authStatus === 'NAR'
    ).length

    const paOrderedCount = allOrders.filter(order =>
      order.paStatus.authStatus === 'PA Ordered'
    ).length

    const blockedCount = allOrders.filter(order =>
      order.paStatus.AutomationWorkflow === 'Blocked'
    ).length

    const inProgressCount = allOrders.filter(order =>
      order.paStatus.AutomationWorkflow === 'In Progress'
    ).length

    const ordersRemaining = allOrders.filter(order =>
      order.paStatus.AutomationWorkflow !== 'Completed'
    ).length

    return {
      totalOrders,
      ordersRemaining,
      paFiledCount,
      narCount,
      paOrderedCount,
      blockedCount,
      inProgressCount
    }
  }

  const stats = calculateProcessingStats()

  const selectedOrder = selectedOrderMRN ? getOrderByMRN(selectedOrderMRN) : null

  const WorkflowModal = () => {
    if (!isWorkflowModalOpen || !selectedOrder) return null

    const workflowSteps = [
      {
        step: 'Order Received',
        status: 'completed',
        description: 'Order created and received in system',
        timestamp: selectedOrder.order.dateOfService
      },
      {
        step: 'Eligibility Verification',
        status: selectedOrder.eligibilityVerification.covered ? 'completed' : 'failed',
        description: selectedOrder.eligibilityVerification.covered
          ? `Coverage verified - ${selectedOrder.payer.status}`
          : 'Coverage verification failed',
        timestamp: selectedOrder.order.dateOfService
      },
      {
        step: 'PA Required Check',
        status: 'completed',
        description: selectedOrder.eligibilityVerification.priorAuthRequired
          ? 'Prior authorization required'
          : 'No prior authorization needed',
        timestamp: selectedOrder.order.dateOfService
      },
      {
        step: 'Document Collection',
        status: selectedOrder.paStatus.AutomationWorkflow === 'Blocked' ? 'blocked' : 'completed',
        description: selectedOrder.paStatus.AutomationWorkflow === 'Blocked'
          ? `Missing requirements: ${selectedOrder.paStatus.issueType || selectedOrder.paStatus.authStatus}`
          : 'All documents collected',
        timestamp: selectedOrder.order.dateOfService
      },
      {
        step: 'PA Submission',
        status: selectedOrder.paStatus.authStatus === 'PA Submitted' || selectedOrder.paStatus.authStatus === 'Auth on File'
          ? 'completed'
          : selectedOrder.paStatus.authStatus === 'PA Ordered'
          ? 'pending'
          : selectedOrder.paStatus.authStatus === 'NAR'
          ? 'completed'
          : 'pending',
        description: selectedOrder.paStatus.authStatus === 'PA Submitted'
          ? 'PA submitted to payer'
          : selectedOrder.paStatus.authStatus === 'Auth on File'
          ? 'Authorization on file'
          : selectedOrder.paStatus.authStatus === 'NAR'
          ? 'Not requiring authorization'
          : selectedOrder.paStatus.authStatus === 'PA Ordered'
          ? 'Ready to file PA'
          : 'Awaiting submission',
        timestamp: selectedOrder.order.dateOfService
      },
      {
        step: 'Authorization Decision',
        status: selectedOrder.paStatus.authStatus === 'Auth on File' || selectedOrder.paStatus.authStatus === 'NAR'
          ? 'completed'
          : 'pending',
        description: selectedOrder.paStatus.authStatus === 'Auth on File'
          ? 'Authorization approved'
          : selectedOrder.paStatus.authStatus === 'NAR'
          ? 'No authorization required (NAR)'
          : 'Awaiting payer decision',
        timestamp: ''
      }
    ]

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Workflow</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedOrder.patient.name} - Order ID: {selectedOrder.orderId}
              </p>
            </div>
            <button
              onClick={() => setIsWorkflowModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 block mb-1">Current Status</span>
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded ${getAuthStatusColor(selectedOrder.paStatus.authStatus)}`}>
                  {selectedOrder.paStatus.authStatus}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Automation Workflow</span>
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded ${getAutomationStatusColor(selectedOrder.paStatus.AutomationWorkflow)}`}>
                  {selectedOrder.paStatus.AutomationWorkflow}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-100' :
                      step.status === 'pending' ? 'bg-yellow-100' :
                      step.status === 'blocked' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      {step.status === 'completed' && (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {step.status === 'pending' && (
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {step.status === 'blocked' && (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {step.status === 'failed' && (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className={`w-0.5 h-12 ${
                        step.status === 'completed' ? 'bg-green-300' :
                        step.status === 'pending' ? 'bg-yellow-300' :
                        'bg-gray-200'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="text-sm font-semibold text-gray-900">{step.step}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    {step.timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(step.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t flex justify-between items-center bg-gray-50">
            <button
              onClick={() => handlePatientClick(selectedOrder.patient.mrn)}
              className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
            >
              View Full Details
            </button>
            <button
              onClick={() => setIsWorkflowModalOpen(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">PA worklist</h1>
          <div className="relative">
            <button
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              onMouseEnter={() => setShowProcessingInfo(true)}
              onMouseLeave={() => setShowProcessingInfo(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Orders Processing Information
            </button>

            {showProcessingInfo && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Processing Statistics</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <span className="text-sm font-semibold text-gray-900">{stats.totalOrders}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Orders Remaining</span>
                    <span className="text-sm font-semibold text-orange-600">{stats.ordersRemaining}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">PA Filed</span>
                    <span className="text-sm font-semibold text-blue-600">{stats.paFiledCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">NAR Count</span>
                    <span className="text-sm font-semibold text-green-600">{stats.narCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">PA Ordered (Not Filed)</span>
                    <span className="text-sm font-semibold text-purple-600">{stats.paOrderedCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{stats.inProgressCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">Blocked</span>
                    <span className="text-sm font-semibold text-red-600">{stats.blockedCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by Patient Name, MRN..."
              className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
            <span>Filters</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Export
          </button>
          <button className="p-2 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Order ID ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Patient Name ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Type ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">CPT Codes ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Payer ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Date of Service ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Auth Status ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Automation Workflow ↓</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    <div className="font-medium text-blue-600">{order.orderId}</div>
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    <div className="font-medium">{order.patientName}</div>
                    <div className="text-xs text-gray-500">MRN: {order.mrn}</div>
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    {order.imagingType}
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    <div className="flex flex-wrap gap-1">
                      {order.cptCodes.map((code, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    {order.payer}
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    {new Date(order.dateOfService).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    <span className={`px-2 py-1 text-xs rounded ${getAuthStatusColor(order.authStatus)}`}>
                      {order.authStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={() => handlePatientClick(order.mrn)}>
                    <span className={`px-2 py-1 text-xs rounded ${getAutomationStatusColor(order.AutomationWorkflow)}`}>
                      {order.AutomationWorkflow}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleViewWorkflow(order.mrn, e)}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <WorkflowModal />
    </div>
  )
}
