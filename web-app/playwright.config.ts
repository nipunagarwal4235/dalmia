import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'**/*.spec.ts',fullyParallel:true,
 use:{baseURL:'http://127.0.0.1:4175',channel:'chrome',trace:'retain-on-failure'},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1050}}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 webServer:{command:'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4175',url:'http://127.0.0.1:4175',reuseExistingServer:!process.env.CI,timeout:30000},
});
