export class ValidationError {
  error: string

  constructor(
    public param: string | null | undefined,
    public message: string
  ) {
    this.error = "validation_error"
  }

  toJSON() {
    return {
      error: this.error,
      param: this.param,
      message: this.message
    }
  }
}
