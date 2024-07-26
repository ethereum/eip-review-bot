import { generateEIPNumber } from '../merge';
import { Octokit, FrontMatter, File } from '../types';
import { getContent } from '@octokit/rest';
import type { Repository } from '@octokit/webhooks-types';

describe('generateEIPNumber', () => {
  it('should generate a draft EIP number for a new draft', async () => {
    const mockGetContent: jest.MockedFunction<typeof getContent> = jest.fn().mockResolvedValue({
      data: [{ name: 'eip-1.md' }, { name: 'eip-2.md' }]
    });

    const mockOctokit: Partial<Octokit> = {
      rest: {
        repos: {
          getContent: mockGetContent,
          endpoint: jest.fn()
        }
      }
    };

    const mockRepository: Partial<Repository> = { 
      owner: { 
        login: 'ethereum',
        id: 1,
        node_id: '',
        avatar_url: '',
        gravatar_id: '',
        url: '',
        html_url: '',
        followers_url: '',
        following_url: '',
        gists_url: '',
        starred_url: '',
        subscriptions_url: '',
        organizations_url: '',
        repos_url: '',
        events_url: '',
        received_events_url: '',
        type: 'Organization',
        site_admin: false
      } 
    };
    
    const mockFrontmatter: FrontMatter = { 
      status: 'Draft', 
      title: 'Test EIP',
      'last-call-deadline': new Date(),
      created: new Date()
    };

    const mockFile: File = { status: 'added', filename: 'test.md', contents: '' };

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
