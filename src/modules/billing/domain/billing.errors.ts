export class PurchaseOwnedByAnotherUserError extends Error {
  constructor() {
    super('The verified purchase is already attached to another user.');
    this.name = PurchaseOwnedByAnotherUserError.name;
  }
}
