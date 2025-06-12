import { $ } from "@david/dax";
import type { Worktree } from "../tui-types.ts";

export const getWorktrees = async (): Promise<Worktree[]> => {
  try {
    const result = await $`git worktree list --porcelain`.stdout("piped").stderr("piped").noThrow();
    if (result.code !== 0) {
      return [];
    }

    const allWorktrees: Worktree[] = [];
    const lines = result.stdout.split("\n").filter((line) => line.trim());

    let currentWorktree: Partial<Worktree> = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        if (currentWorktree.path) {
          allWorktrees.push(currentWorktree as Worktree);
        }
        currentWorktree = {
          path: line.substring(9),
          active: false,
        };
      } else if (line.startsWith("HEAD ")) {
        const head = line.substring(5);
        currentWorktree.branch = head;
        currentWorktree.name = head.split("/").pop() || head;
      } else if (line.startsWith("branch ")) {
        const branch = line.substring(7);
        currentWorktree.branch = branch;
        currentWorktree.name = branch.split("/").pop() || branch;
      } else if (line === "bare") {
        currentWorktree.name = "bare";
        currentWorktree.branch = "bare";
      }
    }

    if (currentWorktree.path) {
      allWorktrees.push(currentWorktree as Worktree);
    }

    // Filter to only show worktrees in ccde_worktrees/ directory
    const currentPath = Deno.cwd();
    const worktreesDir = `${currentPath}/ccde_worktrees`;
    const filteredWorktrees = allWorktrees.filter((wt) => wt.path && wt.path.startsWith(worktreesDir));

    // Mark current worktree as active and ensure all fields are set
    filteredWorktrees.forEach((wt) => {
      wt.active = wt.path === Deno.cwd();
      if (!wt.name) {
        wt.name = wt.path.split("/").pop() || "unknown";
      }
      if (!wt.branch) {
        wt.branch = "unknown";
      }
    });

    return filteredWorktrees;
  } catch {
    // If git worktree is not available, return empty array
    return [];
  }
}

export const getDefaultBranch = async (): Promise<string> => {
  // Try to get the default branch from remote HEAD reference first
  try {
    const result = await $`git ls-remote --symref origin HEAD`.stdout("piped").stderr("piped").noThrow();
    if (result.code === 0) {
      const output = result.stdout;
      const match = output.match(/ref: refs\/heads\/(\w+)\s+HEAD/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Ignore error
  }

  // Try to get from symbolic ref (but handle error properly)
  try {
    const result = await $`git symbolic-ref refs/remotes/origin/HEAD`.stdout("piped").stderr("piped").noThrow();
    if (result.code === 0 && result.stdout.trim()) {
      return result.stdout.trim().replace("refs/remotes/origin/", "");
    }
  } catch {
    // Ignore error
  }

  // Fallback to current branch
  try {
    const result = await $`git branch --show-current`.stdout("piped").stderr("piped").noThrow();
    if (result.code === 0) {
      const currentBranch = result.stdout.trim();
      if (currentBranch) {
        return currentBranch;
      }
    }
  } catch {
    // Ignore error
  }

  // Try to get from git config
  try {
    const result = await $`git config --get init.defaultBranch`.stdout("piped").stderr("piped").noThrow();
    if (result.code === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
  } catch {
    // Ignore error
  }

  // Final fallback
  return "main";
}

export const isDefaultBranch = (worktree: Worktree, defaultBranch: string): boolean => {
  // Check for ccde_ prefixed worktree name (e.g., ccde_main)
  const ccdeWorktreeName = `ccde_${defaultBranch}`;
  return worktree.branch === defaultBranch ||
    worktree.branch === `refs/heads/${defaultBranch}` ||
    worktree.name === ccdeWorktreeName ||
    (worktree.active && worktree.branch === defaultBranch);
}

export const createWorktree = async (name: string, branch?: string): Promise<boolean> => {
  try {
    // Create ccde_worktrees directory if it doesn't exist
    const worktreesDir = "./ccde_worktrees";
    try {
      await Deno.mkdir(worktreesDir, { recursive: true });
    } catch (_error) {
      // Directory already exists or error creating it
    }

    const worktreePath = `${worktreesDir}/${name}`;

    // Check if worktree path already exists
    try {
      await Deno.stat(worktreePath);
      console.error(`Worktree path ${worktreePath} already exists`);
      return false;
    } catch {
      // Path doesn't exist, which is good
    }

    if (branch) {
      // Check if branch exists first
      const branchExists = await $`git show-ref --verify --quiet refs/heads/${branch}`.stdout("piped").stderr("piped")
        .noThrow();

      if (branchExists.code !== 0) {
        // Check if remote branch exists
        const remoteBranchExists = await $`git show-ref --verify --quiet refs/remotes/origin/${branch}`.stdout("piped")
          .stderr("piped").noThrow();

        if (remoteBranchExists.code === 0) {
          // Create local branch from remote with tracking
          const createResult = await $`git branch --track ${branch} origin/${branch}`.stdout("piped").stderr("piped").noThrow();
          if (createResult.code !== 0) {
            console.error(`Failed to create branch from remote: ${createResult.stderr}`);
            return false;
          }
        } else {
          // Create completely new branch
          const currentBranchResult = await $`git branch --show-current`.stdout("piped").stderr("piped").noThrow();
          if (currentBranchResult.code !== 0) {
            console.error("Failed to get current branch");
            return false;
          }
          const currentBranch = currentBranchResult.stdout.trim();

          const createResult = await $`git checkout -b ${branch}`.stdout("piped").stderr("piped").noThrow();
          if (createResult.code !== 0) {
            console.error(`Failed to create new branch: ${createResult.stderr}`);
            return false;
          }
          await $`git checkout ${currentBranch}`.stdout("piped").stderr("piped").noThrow(); // Go back to previous branch
        }
      }

      const result = await $`git worktree add ${worktreePath} ${branch}`.stdout("piped").stderr("piped").noThrow();

      if (result.code !== 0) {
        console.error(`Failed to create worktree: ${result.stderr}`);
        return false;
      }
    } else {
      // Check if branch name already exists
      const branchExists = await $`git show-ref --verify --quiet refs/heads/${name}`.stdout("piped").stderr("piped")
        .noThrow();

      if (branchExists.code === 0) {
        // Branch exists, use it for worktree
        const result = await $`git worktree add ${worktreePath} ${name}`.stdout("piped").stderr("piped").noThrow();

        if (result.code !== 0) {
          console.error(`Failed to create worktree with existing branch: ${result.stderr}`);
          return false;
        }
      } else {
        // Create new branch with the worktree
        const result = await $`git worktree add -b ${name} ${worktreePath}`.stdout("piped").stderr("piped").noThrow();

        if (result.code !== 0) {
          console.error(`Failed to create worktree: ${result.stderr}`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to create worktree:", error);
    return false;
  }
}

export const getBranches = async (): Promise<string[]> => {
  try {
    // Get all local and remote branches
    const localResult = await $`git branch --format='%(refname:short)'`.stdout("piped").stderr("piped").noThrow();
    const remoteResult = await $`git branch -r --format='%(refname:short)'`.stdout("piped").stderr("piped").noThrow();

    if (localResult.code !== 0 || remoteResult.code !== 0) {
      return [];
    }

    const localBranches = localResult.stdout.trim().split("\n")
      .map((branch) => branch.trim())
      .filter((branch) => branch && !branch.startsWith("*"));

    const remoteBranches = remoteResult.stdout.trim().split("\n")
      .map((branch) => branch.trim())
      .filter((branch) => branch && !branch.includes("HEAD"))
      .map((branch) => branch.replace("origin/", ""))
      .filter((branch) => !localBranches.includes(branch));

    // Get existing worktree branches to exclude them
    const worktrees = await getWorktrees();
    const worktreeBranches = worktrees.map((wt) => wt.branch).filter((branch) => branch !== "bare");

    // Combine local and remote branches, excluding worktree branches
    const allBranches = [...new Set([...localBranches, ...remoteBranches])]
      .filter((branch) => !worktreeBranches.includes(branch) && !worktreeBranches.includes(`refs/heads/${branch}`))
      .sort();

    return allBranches;
  } catch (error) {
    console.error("Failed to get branches:", error);
    return [];
  }
}

export const removeWorktree = async (path: string, force: boolean = false): Promise<{success: boolean, error?: string}> => {
  try {
    const command = force ? 
      $`git worktree remove --force ${path}` : 
      $`git worktree remove ${path}`;
    
    const result = await command.stdout("piped").stderr("piped").noThrow();
    
    if (result.code !== 0) {
      return { success: false, error: result.stderr.trim() || "Unknown error occurred" };
    }
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

export const hasUncommittedChanges = async (): Promise<boolean> => {
  try {
    const result = await $`git status --porcelain`.stdout("piped").stderr("piped").noThrow();
    if (result.code === 0) {
      return result.stdout.trim().length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

export const isInMainDirectory = async (): Promise<boolean> => {
  try {
    const currentPath = Deno.cwd();
    const result = await $`git rev-parse --show-toplevel`.stdout("piped").stderr("piped").noThrow();
    if (result.code === 0) {
      const gitRoot = result.stdout.trim();
      return currentPath === gitRoot;
    }
    return false;
  } catch {
    return false;
  }
}

export const backupUncommittedChanges = async (): Promise<boolean> => {
  try {
    const hasChanges = await hasUncommittedChanges();
    if (!hasChanges) {
      return true;
    }

    const addResult = await $`git add .`.stdout("piped").stderr("piped").noThrow();
    if (addResult.code !== 0) {
      console.error("Failed to add files:", addResult.stderr);
      return false;
    }

    const commitResult = await $`git commit -m "Backup before worktree migration"`.stdout("piped").stderr("piped")
      .noThrow();
    if (commitResult.code !== 0) {
      console.error("Failed to commit changes:", commitResult.stderr);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to backup uncommitted changes:", error);
    return false;
  }
}

export const migrateToWorktreeStructure = async (): Promise<
  { success: boolean; worktreePath?: string; message: string }
> => {
  try {
    const defaultBranch = await getDefaultBranch();
    const worktreeName = `ccde_${defaultBranch}`; // Use ccde_ prefix for clarity
    const currentPath = Deno.cwd();
    const worktreePath = `${currentPath}/ccde_worktrees/${worktreeName}`;

    // Check if worktree already exists
    try {
      await Deno.stat(worktreePath);
      return {
        success: false,
        message: `Worktree already exists at ${worktreePath}`,
      };
    } catch {
      // Worktree doesn't exist, which is good
    }

    // Skip backup - user can handle uncommitted changes themselves

    // Create a new branch called ccde_main from the default branch
    // and then create a worktree for that branch
    const branchName = `ccde_${defaultBranch}`;
    const branchResult = await $`git checkout -b ${branchName} ${defaultBranch}`.stdout("piped").stderr("piped")
      .noThrow();

    if (branchResult.code !== 0) {
      // Branch might already exist, try to use it
      const existsResult = await $`git show-ref --verify --quiet refs/heads/${branchName}`.stdout("piped").stderr(
        "piped",
      ).noThrow();
      if (existsResult.code !== 0) {
        return {
          success: false,
          message: `Failed to create branch ${branchName}: ${branchResult.stderr}`,
        };
      }
    }

    // Go back to the original branch
    await $`git checkout ${defaultBranch}`.stdout("piped").stderr("piped").noThrow();

    // Create the worktree using the ccde_main branch
    const createSuccess = await createWorktree(worktreeName, branchName);
    if (!createSuccess) {
      return {
        success: false,
        message: `Failed to create worktree for ${defaultBranch}`,
      };
    }

    return {
      success: true,
      worktreePath,
      message: `Successfully created worktree at ${worktreePath}. You can now switch to it with: cd ${worktreePath}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
