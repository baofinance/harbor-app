import { Bytes } from "@graphprotocol/graph-ts";
import { UserList } from "../generated/schema";

/**
 * Append-only registry of users for a given contract address (token/pool).
 * We reuse the existing UserList entity (originally for Genesis) since it is
 * just { contractAddress, users } and works for any address.
 */
export function ensureUserRegistered(contractAddress: Bytes, user: Bytes): void {
  const id = contractAddress.toHexString();
  let list = UserList.load(id);
  if (list == null) {
    list = new UserList(id);
    list.contractAddress = contractAddress;
    list.users = [];
  }

  // Deduplicate (O(n), acceptable at current scale).
  const users = list.users;
  for (let i = 0; i < users.length; i++) {
    if (users[i].equals(user)) {
      list.save();
      return;
    }
  }

  users.push(user);
  list.users = users;
  list.save();
}


