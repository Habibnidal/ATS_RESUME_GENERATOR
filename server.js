const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resume.html"));
});

app.post("/generate-resume", async (req, res) => {
  try {
    const {
      name,
      title,
      location,
      email,
      phone,
      summary,
      skills,
      exp_section_type,

      exp_role = [],
      exp_start = [],
      exp_end = [],
      exp_desc = [],

      project_name = [],
      project_start = [],
      project_end = [],
      project_desc = [],
      project_github = [],

      edu_name = [],
      edu_start = [],
      edu_end = [],
      edu_desc = []
    } = req.body;

    const escapeHTML = (str = "") =>
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");

    const section = (title, body) =>
      body ? `<h3>${title}</h3>${body}` : "";

    /* ---------- EXPERIENCE / TRAINING / CERT ---------- */
    let experienceHTML = "";

    if (exp_section_type !== "remove") {
      exp_role.forEach((_, i) => {
        if (exp_role[i] || exp_desc[i]) {
          experienceHTML += `
            <div class="item">
              <strong>${escapeHTML(exp_role[i] || "")}</strong><br>
              <small>${escapeHTML(exp_start[i] || "")}${exp_end[i] ? " - " + escapeHTML(exp_end[i]) : ""}</small>
              <p>${escapeHTML(exp_desc[i] || "").replace(/\n/g, "<br>")}</p>
            </div>
          `;
        }
      });
    }

    /* ---------- PROJECTS ---------- */
    let projectsHTML = "";

    project_name.forEach((_, i) => {
      if (project_name[i] || project_desc[i]) {
        projectsHTML += `
          <div class="item">
            <strong>${escapeHTML(project_name[i] || "")}</strong><br>
            <small>${escapeHTML(project_start[i] || "")}${project_end[i] ? " - " + escapeHTML(project_end[i]) : ""}</small>
            <p>${escapeHTML(project_desc[i] || "").replace(/\n/g, "<br>")}</p>
            ${
              project_github[i]
                ? `<a href="${project_github[i]}">${project_github[i]}</a>`
                : ""
            }
          </div>
        `;
      }
    });

    /* ---------- EDUCATION ---------- */
    let educationHTML = "";

    edu_name.forEach((_, i) => {
      if (edu_name[i] || edu_desc[i]) {
        educationHTML += `
          <div class="item">
            <strong>${escapeHTML(edu_name[i] || "")}</strong><br>
            <small>${escapeHTML(edu_start[i] || "")}${edu_end[i] ? " - " + escapeHTML(edu_end[i]) : ""}</small>
            <p>${escapeHTML(edu_desc[i] || "").replace(/\n/g, "<br>")}</p>
          </div>
        `;
      }
    });

    /* ---------- LOAD TEMPLATE ---------- */
    let template = fs.readFileSync("resume_template.html", "utf8");

    template = template
      .replace("{{name}}", escapeHTML(name || ""))
      .replace("{{title}}", escapeHTML(title || ""))
      .replace(
        "{{contact}}",
        [location, email, phone].filter(Boolean).join(" | ")
      )
      .replace(
        "{{summary}}",
        summary ? section("Summary", `<p>${escapeHTML(summary).replace(/\n/g, "<br>")}</p>`) : ""
      )
      .replace(
        "{{experience}}",
        exp_section_type !== "remove"
          ? section(exp_section_type || "Experience", experienceHTML)
          : ""
      )
      .replace(
        "{{skills}}",
        skills ? section("Skills", `<p>${escapeHTML(skills)}</p>`) : ""
      )
      .replace(
        "{{projects}}",
        projectsHTML ? section("Projects", projectsHTML) : ""
      )
      .replace(
        "{{education}}",
        educationHTML ? section("Education", educationHTML) : ""
      );

    /* ---------- PDF ---------- */
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    const page = await browser.newPage();
    await page.setContent(template, { waitUntil: "networkidle0" });

    const filePath = path.join(__dirname, "resume.pdf");

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm"
      }
    });

    await browser.close();

    res.download(filePath, "Resume.pdf");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating resume");
  }
});

app.listen(3000, () => {
  console.log("✅ Resume Generator running at http://localhost:3000");
});
