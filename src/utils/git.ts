import { $ } from "@david/dax";
import { Worktree } from '../tui-types.ts';

export async function getWorktrees(): Promise<Worktree[]> {
  try {
    const result = await $`git worktree list --porcelain`.text();
    const worktrees: Worktree[] = [];
    const lines = result.split('\n').filter(line => line.trim());
    
    let currentWorktree: Partial<Worktree> = {};
    
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as Worktree);
        }
        currentWorktree = { 
          path: line.substring(9),
          active: false 
        };
      } else if (line.startsWith('HEAD ')) {
        const head = line.substring(5);
        currentWorktree.branch = head;
        currentWorktree.name = head.split('/').pop() || head;
      } else if (line.startsWith('branch ')) {
        const branch = line.substring(7);
        currentWorktree.branch = branch;
        currentWorktree.name = branch.split('/').pop() || branch;
      } else if (line === 'bare') {
        currentWorktree.name = 'bare';
        currentWorktree.branch = 'bare';
      }
    }
    
    if (currentWorktree.path) {
      worktrees.push(currentWorktree as Worktree);
    }

    // Mark current worktree as active
    const currentPath = Deno.cwd();
    worktrees.forEach(wt => {
      wt.active = wt.path === currentPath;
      if (!wt.name) {
        wt.name = wt.path.split('/').pop() || 'unknown';
      }
      if (!wt.branch) {
        wt.branch = 'unknown';
      }
    });
    
    return worktrees;
  } catch (error) {
    // If git worktree is not available, create a dummy entry for current directory
    const currentPath = Deno.cwd();
    const dirName = currentPath.split('/').pop() || 'current';
    return [{
      name: dirName,
      path: currentPath,
      branch: 'main',
      active: true,
    }];
  }
}

export async function createWorktree(name: string, branch?: string): Promise<boolean> {
  try {
    const branchArg = branch ? branch : name;
    await $`git worktree add ../${name} ${branchArg}`;
    return true;
  } catch (error) {
    console.error('Failed to create worktree:', error);
    return false;
  }
}

export async function removeWorktree(path: string): Promise<boolean> {
  try {
    await $`git worktree remove ${path}`;
    return true;
  } catch (error) {
    console.error('Failed to remove worktree:', error);
    return false;
  }
}