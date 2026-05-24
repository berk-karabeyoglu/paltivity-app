type Listener = (eventId: string) => void

function makeSignal() {
  const listeners: Listener[] = []
  return {
    emit: (eventId: string) => listeners.forEach(fn => fn(eventId)),
    on: (fn: Listener) => {
      listeners.push(fn)
      return () => {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
  }
}

const requestSignal  = makeSignal()
const approvedSignal = makeSignal()
const rejectedSignal = makeSignal()
const joinedSignal   = makeSignal()
const leftSignal     = makeSignal()

export const emitJoinRequest    = requestSignal.emit
export const onJoinRequest      = requestSignal.on
export const emitJoinApproved   = approvedSignal.emit
export const onJoinApproved     = approvedSignal.on
export const emitJoinRejected   = rejectedSignal.emit
export const onJoinRejected     = rejectedSignal.on
export const emitAttendeeJoined = joinedSignal.emit
export const onAttendeeJoined   = joinedSignal.on
export const emitAttendeeLeft   = leftSignal.emit
export const onAttendeeLeft     = leftSignal.on
