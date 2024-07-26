import { generateEIPNumber } from '../src/merge';
import { Octokit } from '../src/types';
import type { Repository } from '@octokit/webhooks-types';

describe('generateEIPNumber', () => {
  it('should generate a draft EIP number for a new draft', async () => {
    const mockOctokit: Partial<Octokit> = {
      rest: {
        repos: {
          getContent: jest.fn().mockResolvedValue({
            data: [{ name: 'eip-1.md' }, { name: 'eip-2.md' }]
          })
        }
      }
    };
    
    const mockRepository: Partial<Repository> = { owner: { login: 'ethereum' } };
    const mockFrontmatter = { status: 'Draft', title: 'Test EIP' };
    const mockFile = { status: 'added', filename: 'test.md', contents: '' };

    const result = await generateEIPNumber(
      mockOctokit as Octokit,
      mockRepository as Repository,
      mockFrontmatter,
      mockFile,
      false
    );

    expect(result).toBe('draft_test_eip');
  });
});
