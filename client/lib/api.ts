const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_API_URL || "https://adhyayan-ai.onrender.com/api"
    : "http://localhost:5000/api"

class ApiService {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken")
      console.log("Retrieved token:", token ? `${token.substring(0, 20)}...` : "null")
      return token
    }
    return null
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    const token = this.getToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    return headers
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const token = this.getToken()

    console.log(`Making ${options.method || "GET"} request to: ${url}`)
    console.log("Token available:", !!token)

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
      credentials: "include",
    }

    console.log("Request headers:", requestOptions.headers)

    try {
      const response = await fetch(url, requestOptions)

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)

        // Handle specific authentication errors
        if (response.status === 401) {
          console.error("Authentication failed - clearing stored token")
          localStorage.removeItem("authToken")
          localStorage.removeItem("user")
          // Optionally redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
        }

        let error
        try {
          error = JSON.parse(errorText)
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          throw new Error(`API request failed with status ${response.status}: ${errorText}`)
        }
        throw new Error(error.error || `API request failed with status ${response.status}`)
      }

      const responseText = await response.text()
      console.log("Raw response:", responseText.substring(0, 200) + "...")

      if (!responseText) {
        return { success: true }
      }

      try {
        return JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse success response:", parseError)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
    } catch (error) {
      console.error("API Request Error:", error)

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to server. Please check if the backend is running.")
      }

      throw error
    }
  }

  async post(endpoint: string, data: any) {
    return this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async get(endpoint: string) {
    return this.makeRequest(endpoint, {
      method: "GET",
    })
  }

  async delete(endpoint: string) {
    return this.makeRequest(endpoint, {
      method: "DELETE",
    })
  }

  // Authentication methods
  async authenticateWithGoogle(idToken: string, user: any) {
    const response = await this.post("/auth/google", { idToken, user })

    if (response.token) {
      localStorage.setItem("authToken", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))
    }

    return response
  }

  async getUserProfile() {
    return this.get("/user/profile")
  }

  async logout() {
    const response = await this.post("/auth/logout", {})
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
    return response
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  // Get stored user data
  getStoredUser() {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  // Mind Map API methods
  async generateMindMap(subjectName: string, syllabus: string) {
    return this.post("/mindmap/generate", { subjectName, syllabus })
  }

  async getMindMaps() {
    return this.get("/mindmap/list")
  }

  async getMindMap(id: string) {
    return this.get(`/mindmap/${id}`)
  }

  // DELETE mind map method - NEW METHOD
  async deleteMindMap(id: string) {
    console.log(`Deleting mind map with ID: ${id}`)
    return this.delete(`/mindmap/${id}`)
  }

  // Chat API method for Groq integration
  async chatWithGroq(message: string, context?: string, subject?: string) {
    return this.post("/chat/groq", { message, context, subject })
  }

  // Enhanced Audio API methods for Podcast-style generation
  async generateAudio(text: string, voiceId?: string, topicTitle?: string): Promise<Blob> {
    const url = `${API_BASE_URL}/audio/generate`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({
        text: text,
        voice_id: voiceId || "21m00Tcm4TlvDq8ikWAM", // Default to Rachel voice (podcast recommended)
        topic_title: topicTitle || "Learning Topic", // Pass topic title for better podcast script
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Podcast audio generation failed: ${errorText}`)
    }

    return response.blob()
  }

  async getAvailableVoices() {
    return this.get("/audio/voices")
  }

  // Test API connection
  async testConnection() {
    return this.get("/test")
  }
}

export const apiService = new ApiService()
