export interface HostEntry {
  ip: string;
  hostname: string;
  comment?: string;
}

export type EnvironmentCategory = "On-Prem Test Environment" | "Personal" | "Other";

export interface Environment {
  name: string;
  entries: HostEntry[];
  category: EnvironmentCategory;
  isOld?: boolean; // Mark environments that no longer exist in Confluence
}

export const DEFAULT_ENVIRONMENT: Environment = {
  name: "DEFAULT",
  category: "Other",
  entries: [
    { ip: "127.0.0.1", hostname: "localhost", comment: "" },
    { ip: "::1", hostname: "localhost", comment: "" }
  ]
};

export const REQUIRED_LINES = [
  "127.0.0.1       dslauncher.3ds.com # Added by Dassault Systemes. Do not modify this line.",
  "::1             dslauncher.3ds.com # Added by Dassault Systemes. Do not modify this line."
];

export const DEFAULT_HOSTS_CONTENT = `# Copyright (c) 1993-2009 Microsoft Corp.
#
# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.
#
# This file contains the mappings of IP addresses to host names. Each
# entry should be kept on an individual line. The IP address should
# be placed in the first column followed by the corresponding host name.
# The IP address and the host name should be separated by at least one
# space.
#
# Additionally, comments (such as these) may be inserted on individual
# lines or following the machine name denoted by a '#' symbol.
#
# For example:
#
#      102.54.94.97     rhino.acme.com          # source server
#       38.25.63.10     x.acme.com              # x client host

# localhost name resolution is handled within DNS itself.
#	127.0.0.1       localhost
#	::1             localhost



    127.0.0.1       dslauncher.3ds.com # Added by Dassault Systemes. Do not modify this line.
    ::1             dslauncher.3ds.com # Added by Dassault Systemes. Do not modify this line.
`;

