#!/usr/bin/env bun

import { Script } from "@opencode-ai/script"
import { $ } from "bun"
import path from "path"
import semver from "semver"

const opencodePackage = await Bun.file(path.resolve(import.meta.dir, "../packages/opencode/package.json")).json()
const opencodeVersion = opencodePackage.version as string

const branch = await $`git branch --show-current`.text().then((x) => x.trim())
const version =
  process.env.OPENCODE_VERSION ??
  (branch === "main" && !process.env.OPENCODE_BUMP
    ? opencodeVersion
    : process.env.OPENCODE_BUMP
      ? semver.inc(opencodeVersion, process.env.OPENCODE_BUMP.toLowerCase() as semver.ReleaseType) ?? opencodeVersion
      : Script.version)

const output = [`version=${version}`]
const sha = process.env.GITHUB_SHA ?? (await $`git rev-parse HEAD`.text()).trim()

if (!Script.preview) {
  await $`bun script/changelog.ts --to ${sha}`.cwd(process.cwd())
  const file = `${process.cwd()}/UPCOMING_CHANGELOG.md`
  const body = await Bun.file(file)
    .text()
    .catch(() => "No notable changes")
  const dir = process.env.RUNNER_TEMP ?? "/tmp"
  const notesFile = `${dir}/opencode-release-notes.txt`
  await Bun.write(notesFile, body)
  await $`gh release create v${Script.version} -d --target ${sha} --title "v${Script.version}" --notes-file ${notesFile}`
  const release = await $`gh release view v${Script.version} --json tagName,databaseId`.json()
  output.push(`release=${release.databaseId}`)
  output.push(`tag=${release.tagName}`)
} else if (Script.channel === "beta") {
  await $`gh release create v${Script.version} -d --title "v${Script.version}" --repo ${process.env.GH_REPO}`
  const release =
    await $`gh release view v${Script.version} --json tagName,databaseId --repo ${process.env.GH_REPO}`.json()
  output.push(`release=${release.databaseId}`)
  output.push(`tag=${release.tagName}`)
}

output.push(`repo=${process.env.GH_REPO}`)

if (process.env.GITHUB_OUTPUT) {
  await Bun.write(process.env.GITHUB_OUTPUT, output.join("\n"))
}

process.exit(0)
