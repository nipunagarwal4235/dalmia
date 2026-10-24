import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:['management.spec.ts'],workers:1,timeout:90000,use:{baseURL:'http://127.0.0.1:4175',channel:'chrome',trace:'retain-on-failure'},webServer:[{command:'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4175',url:'http://127.0.0.1:4175',reuseExistingServer:false}]});
