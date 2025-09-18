// ids.mjs — Resolve patient UID/MRN + load META (Node 22 ESM)

import { GetCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Resolve an identifier that can be either:
 *  - patient UID  -> returns { uid, meta, mrn: active_mrn?, scheme? }
 *  - MRN (via pointer) -> returns { uid, meta, mrn, scheme, ptr }
 */
export async function resolveAnyPatientId(ddb, TABLE, anyId) {
  if (!anyId) return null;

  // Try as UID (META_LATEST)
  const asUid = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `PATIENT#${anyId}`, SK: "META_LATEST" },
  }));
  if (asUid.Item) {
    return {
      uid: anyId,
      meta: asUid.Item,
      mrn: asUid.Item.active_reg_mrn || null,
      scheme: asUid.Item.active_scheme || null,
    };
  }

  // Else, MRN pointer
  const ptr = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `MRN#${anyId}`, SK: "MRN" },
  }));
  if (!ptr.Item) return null;

  const meta = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `PATIENT#${ptr.Item.patient_uid}`, SK: "META_LATEST" },
  }));

  return {
    uid: ptr.Item.patient_uid,
    mrn: ptr.Item.mrn,
    scheme: ptr.Item.scheme || null,
    meta: meta.Item || null,
    ptr: ptr.Item,
  };
}

export async function loadMetaByUid(ddb, TABLE, uid) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
  }));
  return r.Item || null;
}
