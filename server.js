const express = require("express");
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ---------- HEALTH CHECK ---------- */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ---------- LOADER (OPTIONAL) ---------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resume.html"));
});

/* ---------- PDF GENERATION ---------- */
app.post("/generate-resume", async (req, res) => {
  try {
    const section = (title, content) =>
      content && content.trim()
        ? `<h3>${title}</h3><p>${content.replace(/\n/g, "<br>")}</p>`
        : "";

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

    /* ---------- EXPERIENCE / TRAINING / CERTIFICATION ---------- */
    let experienceHTML = "";

    if (exp_section_type !== "remove") {
      exp_role.forEach((role, i) => {
        if (role || exp_desc[i]) {
          experienceHTML += `
            <div>
              <strong>${role || ""}</strong><br>
              <small>${exp_start[i] || ""} - ${exp_end[i] || ""}</small>
              <p>${(exp_desc[i] || "").replace(/\n/g, "<br>")}</p>
            </div>
          `;
        }
      });

      if (experienceHTML) {
        experienceHTML = `<h3>${exp_section_type}</h3>${experienceHTML}`;
      }
    }

    /* ---------- PROJECTS ---------- */
    let projectsHTML = "";
    project_name.forEach((p, i) => {
      if (p || project_desc[i] || project_github[i]) {
        projectsHTML += `
          <div>
            <strong>${p || ""}</strong><br>
            <small>${project_start[i] || ""} - ${project_end[i] || ""}</small>
            <p>${(project_desc[i] || "").replace(/\n/g, "<br>")}</p>
            ${
              project_github[i]
                ? `<a href="${project_github[i]}">${project_github[i]}</a>`
                : ""
            }
          </div>
        `;
      }
    });

    if (projectsHTML) {
      projectsHTML = `<h3>Projects</h3>${projectsHTML}`;
    }

    /* ---------- EDUCATION ---------- */
    let educationHTML = "";
    edu_name.forEach((e, i) => {
      if (e || edu_desc[i]) {
        educationHTML += `
          <div>
            <strong>${e || ""}</strong><br>
            <small>${edu_start[i] || ""} - ${edu_end[i] || ""}</small>
            <p>${(edu_desc[i] || "").replace(/\n/g, "<br>")}</p>
          </div>
        `;
      }
    });

    if (educationHTML) {
      educationHTML = `<h3>Education</h3>${educationHTML}`;
    }

    /* ---------- LOAD TEMPLATE ---------- */
    let html = fs.readFileSync("resume_template.html", "utf8");

    html = html
      .replace("{{name}}", name || "")
      .replace("{{title}}", title || "")
      .replace(
        "{{contact}}",
        [location, email, phone].filter(Boolean).join(" | ")
      )
      .replace("{{summary}}", section("Summary", summary))
      .replace("{{skills}}", section("Skills", skills))
      .replace("{{experience}}", experienceHTML)
      .replace("{{projects}}", projectsHTML)
      .replace("{{education}}", educationHTML);

    /* ---------- CHROMIUM LAUNCH (PRODUCTION SAFE) ---------- */
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf"
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error("RESUME ERROR 👉", err);
    res.status(500).send("Error generating resume");
  }
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Resume server running on port ${PORT}`);
});
