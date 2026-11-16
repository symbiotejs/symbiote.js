export const WEBMCP_DICT = {
  TOOL_NAME_ATTR: 'toolname',
  TOOL_DESCRIPTION_ATTR: 'tooldescription',
  TOOL_AUTOSUBMIT_ATTR: 'toolautosubmit',
  TOOL_EVENTS: {
    onclick: { event: 'click', description: 'Activate control' },
    onsubmit: { event: 'submit', description: 'Submit form' },
    onchange: { event: 'change', description: 'Commit control value or selection' },
    oninput: { event: 'input', description: 'Insert data into control' },
  },
  EVENTS_KEY: '__symbioteMcpEventHandlers',
  TOOL_DESCRIPTOR_MARKER: '__symbioteToolDescriptor',
  OWNER_ID_KEY: '__symbioteMcpOwnerId',
  SYNC_OWNER_KEY: '__SYMBIOTE_WEBMCP_SYNC_OWNER',
  UNREGISTER_OWNER_KEY: '__SYMBIOTE_WEBMCP_UNREGISTER_OWNER',
  EVENT_TARGET_OWNERS_KEY: '__symbioteMcpEventTargetOwners',
};
