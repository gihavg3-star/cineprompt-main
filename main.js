const CURSOR_API_KEY = "crsr_a5abe9f43220e3bf3e66d84ff1cddc8e60492715c18d448e4811687db7b61670";

async function generateContent(promptText) {
  try {
    const response = await fetch("https://api.cursor.so/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + CURSOR_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: promptText,
        model: "text-davinci-002"
      })
    });

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
  }
}

// مثال ربطه بزر
document.getElementById("generateBtn").addEventListener("click", () => {
  const promptText = document.getElementById("promptInput").value;
  generateContent(promptText);
});