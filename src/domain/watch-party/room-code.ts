import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(random = randomInt) {
  return Array.from({ length: 6 }, () => ALPHABET[random(ALPHABET.length)]).join("");
}
