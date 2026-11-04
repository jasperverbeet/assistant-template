import callUpstream from './callUpstream';
import type { TargetInfo } from './cdpMessageSchema';
import type { BrokerClient, BrokerState } from './keepUpstreamOpen';
import matchesTargetFilter from './matchesTargetFilter';

const CHILD_TARGET_TYPES = new Set(['browser', 'iframe', 'worker']);

/**
 * Attaches a client to a target when the auto-attach filter of the client
 * includes the target. Dia sends `Target.attachedToTarget` for the new session.
 * `forwardUpstreamMessage` sends that event to this client only. The broker
 * skips child targets, because a client attaches to those through its page or
 * tab session.
 *
 * @param state - The shared broker state.
 * @param client - The client with auto-attach on.
 * @param targetInfo - The target.
 * @returns Nothing.
 */
const attachClient = async (
  state: BrokerState,
  client: BrokerClient,
  targetInfo: TargetInfo
) => {
  const targets = state.clients.get(client);
  const { targetId, type } = targetInfo;

  if (
    targets?.autoAttach === undefined ||
    CHILD_TARGET_TYPES.has(type) ||
    !matchesTargetFilter(targets.autoAttach, type) ||
    targets.attached.has(targetId)
  ) {
    return;
  }

  targets.attached.add(targetId);
  const request = { targetId, client };
  state.attaching.push(request);
  const reply = await callUpstream(state, 'Target.attachToTarget', {
    targetId,
    flatten: true
  });

  if (reply.error !== undefined) {
    targets.attached.delete(targetId);
    state.attaching = state.attaching.filter((entry) => entry !== request);
  }
};

export default attachClient;
