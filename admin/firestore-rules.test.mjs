import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const rules = fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8");

test("Firestore 목록 규칙은 100개와 다음 문서 확인용 1개를 허용한다", () => {
  assert.match(rules, /request\.query\.limit <= 101/);
});

test("Firestore 규칙은 Google 게시와 원자적 소유권·좋아요·게시 수 변경만 허용한다", () => {
  assert.match(rules, /sign_in_provider == 'google\.com'/);
  assert.match(rules, /match \/fittings\/\{fittingId\}/);
  assert.match(rules, /request\.resource\.data\.mechId is string/);
  assert.match(rules, /request\.resource\.data\.chassisKey is string/);
  assert.match(rules, /request\.resource\.data\.chassisKey\.matches\('\^\[a-z0-9_-\]\+\$'\)/);
  assert.match(rules, /request\.resource\.data\.schemaVersion == 3/);
  assert.match(rules, /function mechCatalogPath\(mechId\)/);
  assert.match(rules, /function validMechMetadata\(mechId, chassisKey, loadoutCode\)[\s\S]*exists\(catalogPath\)[\s\S]*get\(catalogPath\)\.data\.chassisKey == chassisKey[\s\S]*loadoutCode\[0:3\] == get\(catalogPath\)\.data\.loadoutPrefix/);
  assert.match(rules, /validMechMetadata\([\s\S]*request\.resource\.data\.mechId,[\s\S]*request\.resource\.data\.chassisKey,[\s\S]*request\.resource\.data\.loadoutCode/);
  assert.match(rules, /request\.resource\.data\.name == request\.resource\.data\.name\.trim\(\)/);
  assert.match(rules, /request\.resource\.data\.name\.matches\('\^\[ -~\]\{1,20\}\$'\)/);
  assert.match(rules, /!request\.resource\.data\.name\.matches\('\.\*\[hH\]\[tT\]\[tT\]\[pP\]\[sS\]\.\*'\)/);
  assert.doesNotMatch(rules, /userMechUsage/);
  assert.match(rules, /function usagePath\(uid\)/);
  assert.match(rules, /function validUsageCreateAdvance\(fittingId\)/);
  assert.match(rules, /function validUsageDeleteAdvance\(fittingId\)/);
  assert.match(rules, /getAfter\(usagePath\(request\.auth\.uid\)\)\.data\.count <= 300/);
  assert.match(rules, /getAfter\(usagePath\(request\.auth\.uid\)\)\.data\.count[\s\S]*== get\(usagePath\(request\.auth\.uid\)\)\.data\.count \+ 1/);
  assert.match(rules, /getAfter\(usagePath\(request\.auth\.uid\)\)\.data\.count[\s\S]*== get\(usagePath\(request\.auth\.uid\)\)\.data\.count - 1/);
  assert.match(rules, /match \/publisherUsage\/\{uid\}/);
  assert.match(rules, /allow get: if signedInWithGoogle\(\) && uid == request\.auth\.uid/);
  assert.match(rules, /allow create: if signedInWithGoogle\(\)[\s\S]*request\.resource\.data\.count == 1/);
  assert.match(rules, /allow update: if signedInWithGoogle\(\)[\s\S]*request\.resource\.data\.operation == 'create'[\s\S]*request\.resource\.data\.operation == 'delete'/);
  assert.match(rules, /allow list: if false/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['likeCount'\]\)/);
  assert.match(rules, /existsAfter\(likePath\(fittingId, request\.auth\.uid\)\)/);
  assert.match(rules, /resource\.data\.ownerUid == request\.auth\.uid/);
  assert.match(rules, /existsAfter\(deletionRequestPath\(fittingId\)\)/);
  assert.match(rules, /match \/deletionRequests\/\{fittingId\}/);
  assert.match(rules, /!exists\(deletionRequestPath\(fittingId\)\)/);
  assert.match(rules, /!existsAfter\(fittingPath\(fittingId\)\)/);
  assert.match(rules, /allow read, write: if false;/);
});

test("Firestore 닉네임 규칙은 프로필과 고유 예약을 원자적으로 연결한다", () => {
  assert.match(rules, /function userPath\(uid\)/);
  assert.match(rules, /function nicknamePath\(nicknameKey\)/);
  assert.match(rules, /nickname == nickname\.trim\(\)/);
  assert.match(rules, /nicknameKey == nickname\.lower\(\)/);
  assert.match(rules, /nicknameKey != 'pilot'/);
  assert.match(rules, /nickname\.matches\('\^\[A-Za-z0-9\]\{2,20\}\$'\)/);
  assert.match(rules, /nicknameKey\.matches\('\^\[a-z0-9\]\{2,20\}\$'\)/);
  assert.match(rules, /match \/users\/\{uid\}[\s\S]*allow get: if true;[\s\S]*allow list: if false;/);
  assert.match(rules, /validPromptedProfileCreate\(\) \|\| validNicknameProfileCreate\(\)/);
  assert.match(rules, /validNicknameProfileUpdate\(\)/);
  assert.match(rules, /request\.resource\.data\.nicknameKey != resource\.data\.nicknameKey/);
  assert.match(rules, /!existsAfter\(nicknamePath\(resource\.data\.nicknameKey\)\)/);
  assert.match(rules, /match \/nicknames\/\{nicknameKey\}[\s\S]*allow get: if signedInWithGoogle\(\);[\s\S]*allow list: if false;/);
  assert.match(rules, /let profileExistsAfter = existsAfter\(profilePath\)/);
  assert.match(rules, /getAfter\(nicknamePath\(request\.resource\.data\.nicknameKey\)\)\.data\.ownerUid/);
  assert.match(rules, /allow update: if false;/);
  assert.match(rules, /function validNicknameReservationCreate\(nicknameKey\)[\s\S]*let profileBefore = get\(profilePath\)[\s\S]*let profileAfter = getAfter\(profilePath\)/);
  assert.match(rules, /function validNicknameReservationDelete\(nicknameKey\)[\s\S]*nextNicknameKey != nicknameKey[\s\S]*getAfter\(nextNicknamePath\)\.data\.ownerUid/);
  assert.match(rules, /allow delete: if signedInWithGoogle\(\)[\s\S]*validNicknameReservationDelete\(nicknameKey\)/);
});
