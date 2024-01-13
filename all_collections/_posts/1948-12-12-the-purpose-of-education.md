---
layout: post
title: Ansible Role for Provisioning Virtual Machines in VMware VSphere
date: 2021-11-04
categories: [Ansible]
---

There are a bunch of resources available for creating VMs in VMware environments. The thing is that if we create a VM in production-ready environments, things are a bit, ah, let's say, different. When we are creating a VM by hand in a production-ready environment, there are a few things we usually do that are not directly related to the task of creating the VM. Ok, let me explain. 
    See the below flowchart. This is the most commonly used approach (not 100% complete) when we are creating VMs in production environments.


![VM Provissioning Image](https://lucid.app/publicSegments/view/fa98b297-95df-4611-8ddb-fddd46eb8a81/image.png)
_Folks please consider this is not a technical diagram this is just a diagram I have created to explain my point of view_ 



