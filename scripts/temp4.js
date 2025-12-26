import OpenAI from "openai";

const openai = new OpenAI(
    {
        apiKey: 'sk-27bc50f0b4f646b98e3862c81a49101e',
        
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    }
);

async function main() {
    const completion = await openai.chat.completions.create({
        model: "qwen3-max",
        messages: [{ role: "user", content: "你是谁？"}],
    });
    console.log(completion.choices[0].message.content)
}

main()
