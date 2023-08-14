import type { SignInWithOAuthInput } from '@/graphql/generated/types'
import TokenManager from '@/utils/token-manager'

class AuthProvider {
  name: string
  redirectUrl: (csrfToken: string) => string
  parseOAuthResponse: () => undefined|{ code: string, csrfToken: string}

  constructor(
    { name, redirectUrl, parseOAuthResponse }: {
      name: string,
      redirectUrl: (csrfToken: string) => string
      parseOAuthResponse: () => undefined|{ code: string, csrfToken: string}
    },
  ) {
    this.name = name
    this.redirectUrl = redirectUrl
    this.parseOAuthResponse = parseOAuthResponse
  }

  signInInput(): SignInWithOAuthInput|undefined {
    console.log(2)
    const oauthParams = this.parseOAuthResponse()
    console.log(oauthParams)
    if (!oauthParams) return

    const clientTokenId = this.getClientTokenId()
    if (!clientTokenId) return

    const csrfToken = {
      clientTokenId,
      token: oauthParams.csrfToken,
    }
    console.log(csrfToken)

    return {
      csrfToken,
      oAuthData: {
        code: oauthParams.code,
        providerName: this.name,
      }
    }
  }

  generateClientTokenId(): string {
    return TokenManager.generateToken(this.clientTokenName)
  }

  getClientTokenId(): string|null {
    return TokenManager.fetchAndConsumeToken(this.clientTokenName)
  }

  get clientTokenName() {
    return `${this.name}-token-id`
  }
}

export default AuthProvider