> **Status: deferred (November 12, 2026).** The site uses the AI-only translation process in `docs/translation/` instead. This guide is kept in case Weblate is needed later.

# Weblate on the dedicated MacBook: setup guide

**Machine:** MacBook Pro 13-inch, 2020, Four Thunderbolt 3 ports. 2 GHz quad-core Intel Core i5, 16 GB memory, macOS 26.3 (Tahoe)
**Goal:** run Weblate all the time at `translate.carepayny.com`, reachable only by invited reviewers, with backups.
**When:** week 4 of the 8-week plan (see `docs/PRD.md`, "Translation plan"). Nothing here is needed before then.
**Time:** about 2 to 3 hours the first time. About 15 minutes a month after that.

## What runs where

| Part | What it does | Cost |
| --- | --- | --- |
| macOS 26 | The operating system. Gets security updates until about 2028. | $0 |
| Docker Desktop | Runs Weblate and its database in containers | $0 (free for businesses under 250 people and $10 million a year) |
| Weblate (official Docker setup) | The translation tool | $0 |
| Cloudflare Tunnel (`cloudflared`) | Connects `translate.carepayny.com` to the Mac without opening any ports on the home router | $0 |
| Cloudflare Access | A login gate in front of Weblate. Only listed email addresses get in. | $0 up to 50 users |
| Time Machine + Cloudflare R2 | Backups: one copy at home, one in the cloud | A few dollars a month |
| Outgoing email (SMTP) | Weblate sends invites and password resets | Depends on the provider (see step 4) |

We do not use OrbStack. It needs a paid license for business use.

We do not put Linux on this Mac. Its T2 chip makes Linux hard to install and keep working.

## Step 1: Set up the Mac

1. Update to the latest macOS 26.
2. Make a separate macOS user account named `weblate` for this job. Keep FileVault (disk encryption) on.
3. Keep it plugged in. Use wired internet through a USB-C Ethernet adapter if you can.
4. Stop sleep. Open Terminal and run:

   ```bash
   sudo pmset -a sleep 0
   sudo pmset -a disksleep 0
   sudo pmset -a disablesleep 1   # stays awake with the lid closed
   ```

   Undo with `sudo pmset -a disablesleep 0` if the Mac is ever used as a laptop again.
5. In **System Settings → General → Software Update → Automatic Updates**, turn on security responses and system files, but turn **off** "Install macOS updates." Install macOS updates by hand once a month, so the Mac doesn't restart on its own.
6. In **System Settings → General → Sharing**, turn on **Remote Login** (SSH) only if you want to manage the Mac from another computer.

Because FileVault is on, someone must log in after a restart. That only happens when you install updates.

## Step 2: Install Docker Desktop

1. Download Docker Desktop for Mac (Intel chip) from docker.com and install it.
2. In Docker Desktop **Settings → General**, turn on **Start Docker Desktop when you sign in to your computer**.
3. In **Settings → Resources**, give Docker 4 CPUs and 8 GB of memory. Weblate's minimum is 2 CPUs and 3 GB; this Mac has 4 cores and 16 GB, so this leaves room for macOS.

## Step 3: Install Weblate

1. In Terminal:

   ```bash
   cd ~
   git clone https://github.com/WeblateOrg/docker-compose.git weblate-docker
   cd weblate-docker
   ```

2. Check the processor. Weblate needs a CPU with SSE4.2. This Mac's 10th-generation Core i5 has it, but check once inside Docker:

   ```bash
   docker run --rm alpine grep -c sse4_2 /proc/cpuinfo
   ```

   Any number above 0 is fine.

3. Make a file named `docker-compose.override.yml` in the same folder. **This file holds passwords. It stays on the Mac and never goes in the CarePayNY repository.**

   ```yaml
   services:
     weblate:
       ports:
         - "127.0.0.1:8080:8080"   # only the tunnel can reach it, not the home network
       environment:
         WEBLATE_SITE_DOMAIN: translate.carepayny.com
         WEBLATE_ENABLE_HTTPS: 1
         WEBLATE_ADMIN_EMAIL: hello@carepayny.com
         WEBLATE_ADMIN_PASSWORD: "<long random password>"
         WEBLATE_SERVER_EMAIL: translate@carepayny.com
         WEBLATE_DEFAULT_FROM_EMAIL: translate@carepayny.com
         WEBLATE_EMAIL_HOST: "<smtp host, see step 4>"
         WEBLATE_EMAIL_HOST_USER: "<smtp user>"
         WEBLATE_EMAIL_HOST_PASSWORD: "<smtp password>"
         WEBLATE_REGISTRATION_OPEN: 0      # invite-only
         WEBLATE_GITHUB_USERNAME: "<GitHub username for the token>"
         WEBLATE_GITHUB_TOKEN: "<GitHub token, see step 6>"
         WEBLATE_GITHUB_HOST: api.github.com
       volumes:
         - ~/weblate-backups:/app/data/borgbackup
   ```

4. Start it:

   ```bash
   docker compose up -d
   docker compose logs -f    # watch the first start; Ctrl+C to stop watching
   ```

5. Open `http://localhost:8080` on the Mac and log in as the admin.

## Step 4: Outgoing email

Cloudflare Email Routing only receives mail. Weblate also needs to **send** mail (reviewer invites, password resets). Options:

- **Gmail or Google Workspace** with an app password: free if you already have it.
- **A sending service** such as Postmark, Resend or Amazon SES: free or cheap at this volume, and better for deliverability. It needs a few DNS records on `carepayny.com`.

This is a decision for the owner at setup time.

## Step 5: Cloudflare Tunnel and Access

Claude can create the tunnel, the DNS record and the Access login gate through the Cloudflare account. The owner then runs one command on the Mac.

1. **Tunnel:** a tunnel named `carepayny-weblate`, sending `translate.carepayny.com` to `http://localhost:8080`.
2. **On the Mac:**

   ```bash
   brew install cloudflared            # or download from Cloudflare
   sudo cloudflared service install <TUNNEL TOKEN>
   ```

   This makes the tunnel start by itself when the Mac starts.
3. **Access login gate:** an Access application for `translate.carepayny.com`. Only the owner's email and each reviewer's email can get in. They get a one-time code by email.
4. **Exception for GitHub:** add a bypass rule for the path `/hooks/*`, so GitHub can tell Weblate when the English text changes. Weblate checks these calls itself.

## Step 6: Connect Weblate to GitHub

1. In GitHub, make a **fine-grained personal access token** limited to the `MAM1967/carepayny` repository, with:
   - Contents: read and write
   - Pull requests: read and write
2. Put it in `docker-compose.override.yml` (step 3) and run `docker compose up -d` again.
3. In Weblate, set each component's version control to **GitHub pull request**. Weblate pushes to its own branch and opens a pull request. It never pushes to `main`.
4. In the GitHub repository, **Settings → Webhooks → Add webhook**: URL `https://translate.carepayny.com/hooks/github/`, content type `application/json`, push events only.

## Step 7: Set up the project in Weblate

Follow `docs/PRD.md`, "Translation plan → Weblate setup":

- Two components: "site text" (`src/i18n/*.json`) and "pages" (`src/content/<language>/**/*.md`).
- Load the Spanish glossary.
- Turn on a machine translation service for drafts only.
- Invite each reviewer with the "reviewer" role for their language only.

## Step 8: Backups

1. **Weblate's built-in backup:** in Weblate, **Manage → Backups**, add a backup to a local folder (`/app/data/borgbackup`). It runs every day and lands in `~/weblate-backups` on the Mac.
2. **Time Machine:** back up the Mac to an external drive.
3. **Cloud copy:** copy `~/weblate-backups` to a Cloudflare R2 bucket every night with `rclone`, using a `launchd` job.
4. **Test once:** restore a backup to a test copy before the first reviewer starts.

## Monthly upkeep (about 15 minutes)

```bash
cd ~/weblate-docker
docker compose pull
docker compose down
docker compose up -d
docker compose logs -f
```

Then:

- Install macOS updates, restart and log back in.
- Check that last night's backup is in R2.
- Check that `translate.carepayny.com` loads.

## If something breaks

| Problem | First thing to look at |
| --- | --- |
| `translate.carepayny.com` doesn't load | Is the Mac on and logged in? Is Docker Desktop running? Run `docker compose ps`. |
| Weblate loads but shows errors | `docker compose logs weblate` |
| No pull requests from Weblate | The GitHub token: has it expired? |
| Reviewers can't log in | Their email in the Cloudflare Access policy |
| Home internet is down | The public website is not affected. Only Weblate is down. |

## When to move off this Mac

- When macOS 26 security updates end (about 2028), or
- If upkeep takes too much time.

Then move to Hosted Weblate (from €47 a month) or a rented server. Weblate's backups and export tools carry the glossary, translation memory and history over.
